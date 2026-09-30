package com.foodie.user.service.impl;

import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.OrderDeliveryPort;
import com.foodie.shared.event.DeliveryCompletedEvent;
import com.foodie.user.dto.response.CustomerLoyaltyResponseDto;
import com.foodie.user.dto.response.LoyaltyLedgerItemDto;
import com.foodie.user.entity.CustomerLoyalty;
import com.foodie.user.entity.LoyaltyPointLedger;
import com.foodie.user.repository.CustomerLoyaltyRepository;
import com.foodie.user.repository.LoyaltyPointLedgerRepository;
import com.foodie.user.service.LoyaltyService;
import com.foodie.wallet.service.WalletService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class LoyaltyServiceImpl implements LoyaltyService {

    private static final Logger log = LoggerFactory.getLogger(LoyaltyServiceImpl.class);

    private final CustomerLoyaltyRepository customerLoyaltyRepository;
    private final LoyaltyPointLedgerRepository loyaltyPointLedgerRepository;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final WalletService walletService;
    private final OrderDeliveryPort orderDeliveryPort;
    private final com.foodie.order.repository.OrderRepository orderRepository;

    public LoyaltyServiceImpl(
            CustomerLoyaltyRepository customerLoyaltyRepository,
            LoyaltyPointLedgerRepository loyaltyPointLedgerRepository,
            CustomerSummaryProvider customerSummaryProvider,
            WalletService walletService,
            OrderDeliveryPort orderDeliveryPort,
            com.foodie.order.repository.OrderRepository orderRepository) {
        this.customerLoyaltyRepository = customerLoyaltyRepository;
        this.loyaltyPointLedgerRepository = loyaltyPointLedgerRepository;
        this.customerSummaryProvider = customerSummaryProvider;
        this.walletService = walletService;
        this.orderDeliveryPort = orderDeliveryPort;
        this.orderRepository = orderRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerLoyaltyResponseDto getLoyaltyProfile(UUID userCredentialId) {
        UUID customerId = requireCustomerId(userCredentialId);
        CustomerLoyalty loyalty = getOrCreateLoyalty(customerId);
        List<LoyaltyLedgerItemDto> ledger = loyaltyPointLedgerRepository
                .findByCustomerLoyaltyIdOrderByCreatedAtDesc(loyalty.getId())
                .stream()
                .map(l -> new LoyaltyLedgerItemDto(
                        l.getId(),
                        l.getPoints(),
                        l.getEntryType().name(),
                        l.getReferenceType(),
                        l.getReferenceId(),
                        l.getDescription(),
                        l.getCreatedAt()))
                .toList();

        return new CustomerLoyaltyResponseDto(loyalty.getPointsBalance(), loyalty.getLoyaltyTier().name(), ledger);
    }

    @EventListener
    @Transactional
    public void onDeliveryCompleted(DeliveryCompletedEvent event) {
        log.info("Processing loyalty points for completed order {}", event.orderId());
        orderRepository.findById(event.orderId()).ifPresent(order -> {
            processOrderDeliveryLoyaltyPoints(order.getId(), order.getCustomerId(), order.getTotalAmount());
        });
    }

    @Override
    @Transactional
    public void processOrderDeliveryLoyaltyPoints(UUID orderId, UUID customerId, BigDecimal orderTotal) {
        if (orderTotal == null || orderTotal.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }

        // Earn 10 points per ₹100 spent
        int pointsEarned = orderTotal.multiply(BigDecimal.TEN)
                .divide(new BigDecimal("100"), 0, RoundingMode.DOWN)
                .intValue();

        if (pointsEarned <= 0) {
            return;
        }

        CustomerLoyalty loyalty = getOrCreateLoyalty(customerId);
        loyalty.addPoints(pointsEarned);
        customerLoyaltyRepository.save(loyalty);

        loyaltyPointLedgerRepository.save(LoyaltyPointLedger.create(
                loyalty.getId(),
                pointsEarned,
                LoyaltyPointLedger.EntryType.EARN,
                "ORDER_COMPLETED",
                orderId,
                "Earned " + pointsEarned + " points on order #" + orderId
        ));

        log.info("Awarded {} loyalty points to customer {} for order {}", pointsEarned, customerId, orderId);
    }

    @Override
    @Transactional
    public CustomerLoyaltyResponseDto convertPointsToWallet(UUID userCredentialId, int pointsToConvert) {
        if (pointsToConvert < 100) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Minimum 100 points required for wallet conversion.");
        }

        UUID customerId = requireCustomerId(userCredentialId);
        CustomerLoyalty loyalty = getOrCreateLoyalty(customerId);

        if (loyalty.getPointsBalance() < pointsToConvert) {
            throw new BadRequestException(ErrorCode.INSUFFICIENT_BALANCE, "Insufficient loyalty points balance.");
        }

        // 100 points = ₹10 cash
        BigDecimal cashAmount = new BigDecimal(pointsToConvert)
                .divide(BigDecimal.TEN, 2, RoundingMode.DOWN);

        loyalty.deductPoints(pointsToConvert);
        customerLoyaltyRepository.save(loyalty);

        LoyaltyPointLedger ledger = loyaltyPointLedgerRepository.save(LoyaltyPointLedger.create(
                loyalty.getId(),
                pointsToConvert,
                LoyaltyPointLedger.EntryType.REDEEM,
                "WALLET_CONVERSION",
                UUID.randomUUID(),
                "Converted " + pointsToConvert + " points to ₹" + cashAmount + " wallet balance."
        ));

        walletService.credit(OwnerType.CUSTOMER, customerId, cashAmount, LedgerReferenceType.LOYALTY_CONVERSION, ledger.getId());

        log.info("Converted {} loyalty points to ₹{} wallet credit for customer {}", pointsToConvert, cashAmount, customerId);
        return getLoyaltyProfile(userCredentialId);
    }

    private UUID requireCustomerId(UUID userCredentialId) {
        return customerSummaryProvider.findByUserCredentialId(userCredentialId)
                .map(CustomerSummaryProvider.CustomerSummary::customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
    }

    private CustomerLoyalty getOrCreateLoyalty(UUID customerId) {
        return customerLoyaltyRepository.findByCustomerId(customerId)
                .orElseGet(() -> customerLoyaltyRepository.save(CustomerLoyalty.create(customerId)));
    }
}
