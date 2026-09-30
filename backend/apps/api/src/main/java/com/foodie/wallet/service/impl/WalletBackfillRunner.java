package com.foodie.wallet.service.impl;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.OrderStatus;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class WalletBackfillRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(WalletBackfillRunner.class);

    private final JdbcTemplate jdbcTemplate;
    private final jakarta.persistence.EntityManager entityManager;

    public WalletBackfillRunner(JdbcTemplate jdbcTemplate, jakarta.persistence.EntityManager entityManager) {
        this.jdbcTemplate = jdbcTemplate;
        this.entityManager = entityManager;
    }

    @Override
    public void run(String... args) {
        log.info("Starting native SQL missing Restaurant Wallet backfill...");

        try {
            @SuppressWarnings("unchecked")
            java.util.List<Object[]> orders = entityManager.createQuery(
                    "SELECT o.id, o.restaurantId, o.subtotal, o.taxAmount FROM Order o WHERE o.status IN (:status1, :status2, :status3)")
                    .setParameter("status1", OrderStatus.DELIVERED)
                    .setParameter("status2", OrderStatus.PICKED_UP)
                    .setParameter("status3", OrderStatus.OUT_FOR_DELIVERY)
                    .getResultList();

            for (Object[] row : orders) {
                UUID orderId = (UUID) row[0];
                UUID restaurantId = (UUID) row[1];
                BigDecimal subtotal = (BigDecimal) row[2];
                BigDecimal taxFee = (BigDecimal) row[3];

                if (subtotal == null)
                    subtotal = BigDecimal.ZERO;
                if (taxFee == null)
                    taxFee = BigDecimal.ZERO;

                // Get commission %
                BigDecimal commissionPct = null;
                try {
                    commissionPct = jdbcTemplate.queryForObject(
                            "SELECT commission_pct FROM restaurant r WHERE r.id = ?::uuid",
                            BigDecimal.class, restaurantId.toString());
                } catch (Exception ignored) {
                }
                if (commissionPct == null)
                    commissionPct = new BigDecimal("18.00");

                BigDecimal commissionAmount = subtotal.multiply(commissionPct).divide(new BigDecimal("100"), 2,
                        java.math.RoundingMode.HALF_UP);
                BigDecimal netEarnings = subtotal.subtract(commissionAmount);
                BigDecimal finalEarnings = netEarnings.add(taxFee);

                if (finalEarnings.compareTo(BigDecimal.ZERO) > 0) {
                    try {
                        // 1. Check if ledger exists
                        Integer existCount = jdbcTemplate.queryForObject(
                                "SELECT count(1) FROM ledger_entry WHERE reference_id = ?::uuid AND reference_type = 'ORDER_EARNING'",
                                Integer.class, orderId.toString());
                        if (existCount != null && existCount > 0) {
                            continue;
                        }

                        // 2. Ensure WalletAccount exists
                        jdbcTemplate.update(
                                """
                                            INSERT INTO wallet_account (id, owner_type, owner_id, balance, version, created_at, updated_at)
                                            VALUES (?::uuid, 'RESTAURANT', ?::uuid, 0, 0, now(), now())
                                            ON CONFLICT (owner_type, owner_id) DO NOTHING
                                        """,
                                UUID.randomUUID().toString(), restaurantId.toString());

                        // 3. Insert Ledger Entry
                        jdbcTemplate.update(
                                """
                                            INSERT INTO ledger_entry (id, wallet_account_id, entry_type, amount, reference_type, reference_id, created_at)
                                            SELECT ?::uuid, id, 'CREDIT', ?, 'ORDER_EARNING', ?::uuid, now()
                                            FROM wallet_account WHERE owner_type = 'RESTAURANT' AND owner_id = ?::uuid
                                        """,
                                UUID.randomUUID().toString(), finalEarnings, orderId.toString(),
                                restaurantId.toString());

                        // 4. Update Balance Atomically
                        jdbcTemplate.update("""
                                    UPDATE wallet_account SET balance = balance + ?, updated_at = now()
                                    WHERE owner_type = 'RESTAURANT' AND owner_id = ?::uuid
                                """, finalEarnings, restaurantId.toString());

                        log.info("Backfilled natively for delivered order {} -> +{}", orderId, finalEarnings);
                    } catch (Exception ex) {
                        log.error("Failed to backfill natively {} for restaurant {}. Error: {}", orderId, restaurantId,
                                ex.getMessage());
                    }
                }
            }

            // 5. THE ULTIMATE RECALIBRATION: Fix any desynchronized balances from previous
            // run failures
            int updatedWallets = jdbcTemplate
                    .update("""
                                UPDATE wallet_account w
                                SET balance = COALESCE(
                                    (SELECT COALESCE(SUM(amount), 0) FROM ledger_entry l WHERE l.wallet_account_id = w.id AND l.entry_type = 'CREDIT')
                                    -
                                    (SELECT COALESCE(SUM(amount), 0) FROM ledger_entry l WHERE l.wallet_account_id = w.id AND l.entry_type = 'DEBIT'),
                                0)
                                WHERE w.owner_type = 'RESTAURANT'
                            """);
            log.info("Recalibrated {} restaurant wallets to match their true ledger sums.", updatedWallets);

            log.info("Finished Native Restaurant Wallet backfill!");
        } catch (Exception fatal) {
            log.error("Wallet backfill runner failed entirely: ", fatal);
        }
    }
}
