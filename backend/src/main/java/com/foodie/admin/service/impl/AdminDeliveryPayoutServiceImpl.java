package com.foodie.admin.service.impl;

import com.foodie.admin.dto.response.AdminDeliveryPayoutResponseDto;
import com.foodie.admin.dto.response.AdminPayoutDetailResponseDto;
import com.foodie.admin.dto.response.AdminPayoutReconciliationDto;
import com.foodie.admin.service.AdminDeliveryPayoutService;
import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.LedgerEntryType;
import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.enums.ReconciliationStatus;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.mapper.WalletMapper;
import com.foodie.wallet.repository.LedgerEntryRepository;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.WalletService.PageResult;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminDeliveryPayoutServiceImpl implements AdminDeliveryPayoutService {

    private static final Logger log = LoggerFactory.getLogger(AdminDeliveryPayoutServiceImpl.class);

    private final PayoutRepository payoutRepository;
    private final WalletAccountRepository walletAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final DeliveryPartnerLookup deliveryPartnerLookup;

    public AdminDeliveryPayoutServiceImpl(
            PayoutRepository payoutRepository,
            WalletAccountRepository walletAccountRepository,
            LedgerEntryRepository ledgerEntryRepository,
            DeliveryPartnerLookup deliveryPartnerLookup) {
        this.payoutRepository = payoutRepository;
        this.walletAccountRepository = walletAccountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.deliveryPartnerLookup = deliveryPartnerLookup;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<AdminDeliveryPayoutResponseDto> listPayouts(
            String partnerQuery,
            UUID payoutId,
            PayoutStatus status,
            PayoutProvider provider,
            Instant dateFrom,
            Instant dateTo,
            int page,
            int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        List<Payout> allPayouts = payoutRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        List<Payout> filtered = allPayouts.stream().filter(p -> {
            if (payoutId != null && !p.getId().equals(payoutId)) {
                return false;
            }
            if (status != null && p.getStatus() != status) {
                return false;
            }
            if (provider != null && p.getProvider() != provider) {
                return false;
            }
            if (dateFrom != null && p.getCreatedAt().isBefore(dateFrom)) {
                return false;
            }
            if (dateTo != null && p.getCreatedAt().isAfter(dateTo)) {
                return false;
            }
            if (partnerQuery != null && !partnerQuery.isBlank()) {
                String q = partnerQuery.trim().toLowerCase();
                boolean matchName = p.getAccountHolderName() != null && p.getAccountHolderName().toLowerCase().contains(q);
                boolean matchAccount = p.getAccountNumber() != null && p.getAccountNumber().toLowerCase().contains(q);
                boolean matchWallet = p.getWalletAccountId() != null && p.getWalletAccountId().toString().toLowerCase().contains(q);
                boolean matchBankRef = p.getBankRef() != null && p.getBankRef().toLowerCase().contains(q);
                return matchName || matchAccount || matchWallet || matchBankRef;
            }
            return true;
        }).toList();

        int totalElements = filtered.size();
        int totalPages = (int) Math.ceil((double) totalElements / pageable.getPageSize());
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), totalElements);

        List<Payout> pageContent = (start <= totalElements && start >= 0)
                ? filtered.subList(start, end)
                : List.of();

        List<AdminDeliveryPayoutResponseDto> dtos = pageContent.stream()
                .map(this::mapToAdminPayoutDto)
                .toList();

        PaginationMeta meta = new PaginationMeta(page, pageable.getPageSize(), totalElements, totalPages);
        return new PageResult<>(dtos, meta);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPayoutDetailResponseDto getPayoutDetail(UUID payoutId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found with ID: " + payoutId));

        AdminDeliveryPayoutResponseDto payoutDto = mapToAdminPayoutDto(payout);

        WalletAccount walletAccount = walletAccountRepository.findById(payout.getWalletAccountId()).orElse(null);
        BigDecimal balance = walletAccount != null ? walletAccount.getBalance() : BigDecimal.ZERO;

        List<LedgerEntryResponseDto> ledgerHistory = List.of();
        if (walletAccount != null) {
            Pageable topLedger = PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
            ledgerHistory = ledgerEntryRepository.findByWalletAccountId(walletAccount.getId(), topLedger)
                    .getContent()
                    .stream()
                    .map(WalletMapper::toLedger)
                    .toList();
        }

        BigDecimal totalEarned = ledgerHistory.stream()
                .filter(l -> l.entryType() == LedgerEntryType.CREDIT)
                .map(LedgerEntryResponseDto::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        AdminPayoutDetailResponseDto.ProviderInfoReadonly providerInfo = new AdminPayoutDetailResponseDto.ProviderInfoReadonly(
                payout.getProvider().name(),
                "STUB_LIVE_HYBRID",
                "OPERATIONAL",
                Instant.now().toString()
        );

        return new AdminPayoutDetailResponseDto(
                payoutDto,
                balance,
                totalEarned,
                ledgerHistory,
                providerInfo
        );
    }

    @Override
    @Transactional
    public AdminDeliveryPayoutResponseDto retryPayout(UUID payoutId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found with ID: " + payoutId));

        if (payout.getStatus() != PayoutStatus.FAILED) {
            throw new UnprocessableEntityException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Only payouts in FAILED status are eligible for retry.");
        }

        payout.retryFailedPayout();
        Payout saved = payoutRepository.save(payout);
        log.info("Admin initiated retry for Payout ID: {}", payoutId);

        return mapToAdminPayoutDto(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPayoutReconciliationDto getReconciliationOverview() {
        List<Payout> allPayouts = payoutRepository.findAll();

        long matched = allPayouts.stream().filter(p -> p.getReconciliationStatus() == ReconciliationStatus.MATCHED).count();
        long amountMismatch = allPayouts.stream().filter(p -> p.getReconciliationStatus() == ReconciliationStatus.AMOUNT_MISMATCH).count();
        long statusMismatch = allPayouts.stream().filter(p -> p.getReconciliationStatus() == ReconciliationStatus.STATUS_MISMATCH).count();
        long missingProvider = allPayouts.stream().filter(p -> p.getReconciliationStatus() == ReconciliationStatus.MISSING_PROVIDER_RECORD).count();
        long duplicate = allPayouts.stream().filter(p -> p.getReconciliationStatus() == ReconciliationStatus.DUPLICATE).count();

        List<AdminDeliveryPayoutResponseDto> discrepancies = allPayouts.stream()
                .filter(p -> p.getReconciliationStatus() != ReconciliationStatus.MATCHED)
                .map(this::mapToAdminPayoutDto)
                .toList();

        return new AdminPayoutReconciliationDto(
                matched,
                amountMismatch,
                statusMismatch,
                missingProvider,
                duplicate,
                discrepancies
        );
    }

    private AdminDeliveryPayoutResponseDto mapToAdminPayoutDto(Payout payout) {
        UUID partnerId = null;
        WalletAccount account = walletAccountRepository.findById(payout.getWalletAccountId()).orElse(null);
        if (account != null) {
            partnerId = account.getOwnerId();
        }

        String partnerName = payout.getAccountHolderName() != null ? payout.getAccountHolderName() : "Delivery Partner";
        String partnerPhone = "+91 98765 43210";

        boolean retryEligible = payout.getStatus() == PayoutStatus.FAILED;

        return new AdminDeliveryPayoutResponseDto(
                payout.getId(),
                payout.getWalletAccountId(),
                partnerId,
                partnerName,
                partnerPhone,
                payout.getAmount(),
                payout.getStatus(),
                payout.getProvider(),
                payout.getBankRef(),
                payout.getFailureReason(),
                payout.getCreatedAt(),
                payout.getProcessedAt(),
                payout.getReconciliationStatus(),
                retryEligible,
                payout.getAccountHolderName(),
                payout.getAccountNumber(),
                payout.getIfscCode(),
                payout.getBankName()
        );
    }
}
