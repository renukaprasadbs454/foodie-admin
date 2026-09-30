package com.foodie.wallet.service.impl;

import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.common.exception.UnprocessableEntityException;
import com.foodie.restaurant.entity.Restaurant;
import com.foodie.restaurant.repository.RestaurantRepository;
import com.foodie.common.enums.UserType;
import com.foodie.shared.contract.CustomerSummaryProvider;
import com.foodie.shared.contract.RestaurantSummaryProvider;
import com.foodie.shared.contract.DeliveryPartnerLookup;
import com.foodie.shared.event.PayoutCompletedEvent;
import com.foodie.shared.event.PayoutRequestedEvent;
import com.foodie.shared.event.WalletCreditedEvent;
import com.foodie.shared.event.WalletDebitedEvent;
import com.foodie.wallet.WalletConstants;
import com.foodie.wallet.dto.request.PayoutRequestDto;
import com.foodie.wallet.dto.response.LedgerEntryResponseDto;
import com.foodie.wallet.dto.response.PayoutResponseDto;
import com.foodie.wallet.dto.response.WalletBalanceResponseDto;
import com.foodie.wallet.entity.LedgerEntry;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.mapper.WalletMapper;
import com.foodie.wallet.repository.LedgerEntryRepository;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.PayoutIdempotencyStore;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WalletServiceImpl implements WalletService {

    private static final Logger log = LoggerFactory.getLogger(WalletServiceImpl.class);
    private static final EnumSet<PayoutStatus> OPEN_PAYOUT_STATUSES = EnumSet.of(
            PayoutStatus.REQUESTED,
            PayoutStatus.PROCESSING,
            PayoutStatus.APPROVED);

    private final WalletAccountRepository walletAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final PayoutRepository payoutRepository;
    private final DeliveryPartnerLookup deliveryPartnerLookup;
    private final RestaurantRepository restaurantRepository;
    private final CustomerSummaryProvider customerSummaryProvider;
    private final RestaurantSummaryProvider restaurantSummaryProvider;
    private final PayoutIdempotencyStore payoutIdempotencyStore;
    private final ApplicationEventPublisher eventPublisher;
    private final com.foodie.order.repository.OrderRepository orderRepository;

    public WalletServiceImpl(
            WalletAccountRepository walletAccountRepository,
            LedgerEntryRepository ledgerEntryRepository,
            PayoutRepository payoutRepository,
            DeliveryPartnerLookup deliveryPartnerLookup,
            RestaurantRepository restaurantRepository,
            CustomerSummaryProvider customerSummaryProvider,
            RestaurantSummaryProvider restaurantSummaryProvider,
            PayoutIdempotencyStore payoutIdempotencyStore,
            ApplicationEventPublisher eventPublisher,
            com.foodie.order.repository.OrderRepository orderRepository) {
        this.walletAccountRepository = walletAccountRepository;
        this.ledgerEntryRepository = ledgerEntryRepository;
        this.payoutRepository = payoutRepository;
        this.deliveryPartnerLookup = deliveryPartnerLookup;
        this.restaurantRepository = restaurantRepository;
        this.customerSummaryProvider = customerSummaryProvider;
        this.restaurantSummaryProvider = restaurantSummaryProvider;
        this.payoutIdempotencyStore = payoutIdempotencyStore;
        this.eventPublisher = eventPublisher;
        this.orderRepository = orderRepository;
    }

    private UUID resolveOwnerId(UUID userCredentialId, UserType userType) {
        return switch (userType) {
            case DELIVERY_PARTNER -> deliveryPartnerLookup.findPartnerIdByUserCredentialId(userCredentialId)
                    .orElse(userCredentialId);
            case CUSTOMER -> customerSummaryProvider.findByUserCredentialId(userCredentialId)
                    .map(CustomerSummaryProvider.CustomerSummary::customerId)
                    .orElse(userCredentialId);
            case RESTAURANT -> restaurantSummaryProvider.findByOwnerUserCredentialId(userCredentialId)
                    .map(com.foodie.shared.contract.RestaurantSummaryProvider.RestaurantSummary::restaurantId)
                    .orElse(userCredentialId);
            default -> throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Unsupported user type for wallet.");
        };
    }

    private OwnerType resolveOwnerType(UserType userType) {
        return switch (userType) {
            case DELIVERY_PARTNER -> OwnerType.DELIVERY_PARTNER;
            case CUSTOMER -> OwnerType.CUSTOMER;
            case RESTAURANT -> OwnerType.RESTAURANT;
            default -> throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Unsupported user type for wallet.");
        };
    }

    @Override
    @Transactional
    public WalletBalanceResponseDto getBalance(UUID userCredentialId, UserType userType) {
        UUID ownerId = resolveOwnerId(userCredentialId, userType);
        OwnerType ownerTypeEnum = resolveOwnerType(userType);
        WalletAccount account = getOrCreate(ownerTypeEnum, ownerId);
        if (ownerTypeEnum == OwnerType.DELIVERY_PARTNER && account.getBalance().compareTo(BigDecimal.ZERO) == 0
                && ledgerEntryRepository.findByWalletAccountId(account.getId(), PageRequest.of(0, 1)).isEmpty()) {
            account.setBalance(new BigDecimal("2000.00"));
            account = walletAccountRepository.save(account);
            ledgerEntryRepository.save(LedgerEntry.credit(
                    account.getId(),
                    new BigDecimal("2000.00"),
                    LedgerReferenceType.INCENTIVE,
                    account.getId()));
        }
        return WalletMapper.toBalance(account);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PayoutResponseDto> getPayouts(UUID userCredentialId, UserType userType) {
        UUID ownerId = resolveOwnerId(userCredentialId, userType);
        OwnerType ownerTypeEnum = resolveOwnerType(userType);
        WalletAccount account = findOrDefault(ownerTypeEnum, ownerId);
        if (account.getId() == null) {
            return List.of();
        }
        List<Payout> payouts = payoutRepository.findByWalletAccountIdOrderByCreatedAtDesc(account.getId());
        return payouts.stream().map(WalletMapper::toPayout).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PayoutResponseDto getPayoutDetail(UUID userCredentialId, UserType userType, UUID payoutId) {
        UUID ownerId = resolveOwnerId(userCredentialId, userType);
        OwnerType ownerTypeEnum = resolveOwnerType(userType);
        WalletAccount account = findOrDefault(ownerTypeEnum, ownerId);
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));
        if (!payout.getWalletAccountId().equals(account.getId())) {
            throw new ResourceNotFoundException("Payout not found: " + payoutId);
        }
        return WalletMapper.toPayout(payout);
    }

    @Override
    @Transactional
    public PayoutResponseDto completeApprovedPayout(UUID userCredentialId, UUID payoutId) {
        UUID partnerId = requirePartnerId(userCredentialId);
        WalletAccount account = getOrCreateForUpdate(OwnerType.DELIVERY_PARTNER, partnerId);
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));

        if (!payout.getWalletAccountId().equals(account.getId())) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Payout does not belong to the current partner.");
        }

        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Payout is already completed.");
        }

        if (payout.getStatus() == PayoutStatus.REJECTED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Cannot complete a rejected payout.");
        }

        if (payout.getStatus() != PayoutStatus.APPROVED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Payout must be approved by admin before completing withdrawal. Current status: " + payout.getStatus());
        }

        if (account.getBalance().compareTo(payout.getAmount()) < 0) {
            throw new UnprocessableEntityException(ErrorCode.INSUFFICIENT_BALANCE, "Insufficient wallet balance to complete withdrawal.");
        }

        payout.markCompletedDirect("WTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payoutRepository.save(payout);

        account.applyDebit(payout.getAmount());
        walletAccountRepository.save(account);

        LedgerEntry ledgerEntry = ledgerEntryRepository.save(
                LedgerEntry.debit(account.getId(), payout.getAmount(), LedgerReferenceType.PAYOUT, payout.getId()));

        eventPublisher.publishEvent(WalletDebitedEvent.of(
                account.getId(),
                OwnerType.DELIVERY_PARTNER,
                partnerId,
                payout.getAmount(),
                LedgerReferenceType.PAYOUT,
                payout.getId(),
                ledgerEntry.getId()));

        eventPublisher.publishEvent(PayoutCompletedEvent.of(
                payout.getId(),
                account.getId(),
                partnerId,
                payout.getAmount(),
                payout.getProvider(),
                payout.getProviderPayoutId(),
                payout.getBankRef()));

        return WalletMapper.toPayout(payout);
    }

    @Override
    @Transactional
    public PayoutResponseDto approvePayout(UUID payoutId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));
        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Payout is already completed.");
        }
        if (payout.getStatus() == PayoutStatus.REJECTED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Cannot approve a rejected payout.");
        }
        if (payout.getStatus() != PayoutStatus.REQUESTED && payout.getStatus() != PayoutStatus.PROCESSING && payout.getStatus() != PayoutStatus.APPROVED) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Only pending payouts can be approved. Current status: " + payout.getStatus());
        }

        WalletAccount account = walletAccountRepository.findByIdForUpdate(payout.getWalletAccountId())
                .orElseThrow(() -> new ResourceNotFoundException("Wallet account not found: " + payout.getWalletAccountId()));

        if (account.getBalance().compareTo(payout.getAmount()) < 0) {
            throw new UnprocessableEntityException(ErrorCode.INSUFFICIENT_BALANCE, "Insufficient wallet balance to complete withdrawal.");
        }

        payout.markCompletedDirect("PAY-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        payoutRepository.save(payout);

        account.applyDebit(payout.getAmount());
        walletAccountRepository.save(account);

        LedgerEntry ledgerEntry = ledgerEntryRepository.save(
                LedgerEntry.debit(account.getId(), payout.getAmount(), LedgerReferenceType.PAYOUT, payout.getId()));

        eventPublisher.publishEvent(WalletDebitedEvent.of(
                account.getId(),
                account.getOwnerType(),
                account.getOwnerId(),
                payout.getAmount(),
                LedgerReferenceType.PAYOUT,
                payout.getId(),
                ledgerEntry.getId()));

        eventPublisher.publishEvent(PayoutCompletedEvent.of(
                payout.getId(),
                account.getId(),
                account.getOwnerId(),
                payout.getAmount(),
                payout.getProvider(),
                payout.getProviderPayoutId(),
                payout.getBankRef()));

        return WalletMapper.toPayout(payout);
    }

    @Override
    @Transactional
    public PayoutResponseDto rejectPayout(UUID payoutId, String reason) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));
        if (payout.getStatus() != PayoutStatus.REQUESTED && payout.getStatus() != PayoutStatus.PROCESSING) {
            throw new BadRequestException(ErrorCode.ILLEGAL_STATUS_TRANSITION, "Only pending payouts can be rejected. Current status: " + payout.getStatus());
        }
        payout.markRejected(reason != null && !reason.isBlank() ? reason : "Rejected by Admin");
        payoutRepository.save(payout);
        return WalletMapper.toPayout(payout);
    }

    @Override
    @Transactional
    public PageResult<LedgerEntryResponseDto> getLedger(
            UUID userCredentialId,
            UserType userType,
            int page,
            int size,
            String sort,
            Instant createdAtFrom,
            Instant createdAtTo) {
        UUID ownerId = resolveOwnerId(userCredentialId, userType);
        OwnerType ownerTypeEnum = resolveOwnerType(userType);
        WalletAccount account = findOrDefault(ownerTypeEnum, ownerId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
        Page<LedgerEntry> result;

        if (createdAtFrom == null && createdAtTo == null) {
            result = ledgerEntryRepository.findByWalletAccountId(account.getId(), pageable);
        } else {
            result = ledgerEntryRepository.findHistory(
                    account.getId(), createdAtFrom, createdAtTo, pageable);
        }

        List<LedgerEntryResponseDto> items = result.getContent().stream()
                .map(e -> WalletMapper.toLedger(e, null))
                .toList();
        PaginationMeta meta = new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
        return new PageResult<>(items, meta);
    }

    @Override
    @Transactional
    public PayoutResponseDto requestPayout(
            UUID userCredentialId,
            PayoutRequestDto request,
            String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var cached = payoutIdempotencyStore.find(idempotencyKey.trim());
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        UUID partnerId = requirePartnerId(userCredentialId);
        WalletAccount account = getOrCreateForUpdate(OwnerType.DELIVERY_PARTNER, partnerId);
        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);

        BigDecimal openPayouts = payoutRepository.sumAmountByWalletAccountIdAndStatusIn(
                account.getId(), OPEN_PAYOUT_STATUSES);
        if (openPayouts == null)
            openPayouts = BigDecimal.ZERO;
        BigDecimal available = account.getBalance().subtract(openPayouts);
        if (amount.compareTo(available) > 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.INSUFFICIENT_BALANCE,
                    "Requested payout exceeds available wallet balance.");
        }

        String accHolder = request.accountHolderName();
        String accNumber = request.accountNumber();
        String ifsc = request.ifscCode();
        String bName = request.bankName();

        var bankDetails = deliveryPartnerLookup.findBankDetailsByPartnerId(partnerId);
        if (bankDetails.isPresent()) {
            var b = bankDetails.get();
            if ((accHolder == null || accHolder.isBlank() || "Saved in Profile".equalsIgnoreCase(accHolder)) && b.accountHolderName() != null && !b.accountHolderName().isBlank()) {
                accHolder = b.accountHolderName();
            }
            if ((accNumber == null || accNumber.isBlank() || "****".equals(accNumber)) && b.accountNumber() != null && !b.accountNumber().isBlank()) {
                accNumber = b.accountNumber();
            }
            if ((ifsc == null || ifsc.isBlank() || "****".equals(ifsc)) && b.ifscCode() != null && !b.ifscCode().isBlank()) {
                ifsc = b.ifscCode();
            }
            if ((bName == null || bName.isBlank() || "Saved in Profile".equalsIgnoreCase(bName)) && b.bankName() != null && !b.bankName().isBlank()) {
                bName = b.bankName();
            }
        }

        // REQUESTED does not debit the ledger — bank settlement (out of Module 9 scope)
        // will.
        Payout payout = payoutRepository.save(Payout.request(account.getId(), amount, accHolder,
                accNumber, ifsc, bName));
        PayoutResponseDto response = WalletMapper.toPayout(payout);
        eventPublisher.publishEvent(PayoutRequestedEvent.of(
                payout.getId(), account.getId(), partnerId, amount));

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            payoutIdempotencyStore.store(idempotencyKey.trim(), response);
        }
        return response;
    }

    @Override
    @Transactional
    public LedgerEntryResponseDto credit(
            OwnerType ownerType,
            UUID ownerId,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId) {
        validateAmount(amount);
        validateOwner(ownerType, ownerId);

        var existing = ledgerEntryRepository.findByReferenceTypeAndReferenceId(referenceType, referenceId);
        if (existing.isPresent()) {
            log.info("Idempotent credit skip: {} / {}", referenceType, referenceId);
            return WalletMapper.toLedger(existing.get(), null);
        }

        WalletAccount account = getOrCreateForUpdate(ownerType, ownerId);
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        LedgerEntry entry;
        try {
            entry = ledgerEntryRepository.save(
                    LedgerEntry.credit(account.getId(), scaled, referenceType, referenceId));
        } catch (DataIntegrityViolationException ex) {
            return WalletMapper.toLedger(ledgerEntryRepository
                    .findByReferenceTypeAndReferenceId(referenceType, referenceId)
                    .orElseThrow(() -> ex), null);
        }
        account.applyCredit(scaled);
        walletAccountRepository.save(account);

        eventPublisher.publishEvent(WalletCreditedEvent.of(
                account.getId(),
                ownerType,
                ownerId,
                scaled,
                referenceType,
                referenceId,
                entry.getId()));
        return WalletMapper.toLedger(entry, null);
    }

    @Override
    @Transactional
    public LedgerEntryResponseDto debit(
            OwnerType ownerType,
            UUID ownerId,
            BigDecimal amount,
            LedgerReferenceType referenceType,
            UUID referenceId) {
        validateAmount(amount);
        validateOwner(ownerType, ownerId);

        var existing = ledgerEntryRepository.findByReferenceTypeAndReferenceId(referenceType, referenceId);
        if (existing.isPresent()) {
            log.info("Idempotent debit skip: {} / {}", referenceType, referenceId);
            return WalletMapper.toLedger(existing.get(), null);
        }

        WalletAccount account = getOrCreateForUpdate(ownerType, ownerId);
        BigDecimal scaled = amount.setScale(2, RoundingMode.HALF_UP);
        if (account.getBalance().compareTo(scaled) < 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.INSUFFICIENT_BALANCE,
                    "Wallet balance is insufficient for debit.");
        }

        LedgerEntry entry = ledgerEntryRepository.save(
                LedgerEntry.debit(account.getId(), scaled, referenceType, referenceId));
        account.applyDebit(scaled);
        walletAccountRepository.save(account);

        eventPublisher.publishEvent(WalletDebitedEvent.of(
                account.getId(),
                ownerType,
                ownerId,
                scaled,
                referenceType,
                referenceId,
                entry.getId()));
        return WalletMapper.toLedger(entry, null);
    }

    @Override
    @Transactional(readOnly = true)
    public WalletBalanceResponseDto getRestaurantBalance(UUID ownerCredentialId) {
        UUID restaurantId = requireRestaurantId(ownerCredentialId);
        WalletAccount account = findOrDefault(OwnerType.RESTAURANT, restaurantId);

        // Return pure dynamic calculation to dodge JPA persist crashes on GET endpoint
        BigDecimal actualBalance = calculateTrueRestaurantBalance(restaurantId, account.getId());

        return new WalletBalanceResponseDto(account.getId(), actualBalance);
    }

    @Override
    @Transactional
    public PageResult<LedgerEntryResponseDto> getRestaurantLedger(
            UUID ownerCredentialId,
            int page,
            int size,
            String sort,
            Instant createdAtFrom,
            Instant createdAtTo) {
        UUID restaurantId = requireRestaurantId(ownerCredentialId);
        WalletAccount account = findOrDefault(OwnerType.RESTAURANT, restaurantId);
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size), resolveSort(sort));
        Page<LedgerEntry> result = ledgerEntryRepository.findHistory(
                account.getId(), createdAtFrom, createdAtTo, pageable);
        List<LedgerEntryResponseDto> items = result.getContent().stream()
                .map(e -> {
                    String status = null;
                    if (e.getReferenceType() == com.foodie.common.enums.LedgerReferenceType.PAYOUT) {
                        status = payoutRepository.findById(e.getReferenceId())
                                .map(p -> p.getStatus().name())
                                .orElse(null);
                    }
                    return WalletMapper.toLedger(e, status);
                })
                .toList();
        PaginationMeta meta = new PaginationMeta(
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages());
        return new PageResult<>(items, meta);
    }

    @Override
    @Transactional
    public PayoutResponseDto requestRestaurantPayout(
            UUID ownerCredentialId,
            PayoutRequestDto request,
            String idempotencyKey) {
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var cached = payoutIdempotencyStore.find(idempotencyKey.trim());
            if (cached.isPresent()) {
                return cached.get();
            }
        }

        UUID restaurantId = requireRestaurantId(ownerCredentialId);
        WalletAccount account = getOrCreateForUpdate(OwnerType.RESTAURANT, restaurantId);

        // Pre-save to assure a UUID is assigned if it was transient
        if (account.getId() == null) {
            account = walletAccountRepository.saveAndFlush(account);
        }

        // Self-Healing Balance Calculator before checking limits
        BigDecimal actualBalance = calculateTrueRestaurantBalance(restaurantId, account.getId());
        if (account.getBalance().compareTo(actualBalance) != 0) {
            account.setBalance(actualBalance);
            account = walletAccountRepository.saveAndFlush(account);
        }

        BigDecimal amount = request.amount().setScale(2, RoundingMode.HALF_UP);

        BigDecimal openPayouts = payoutRepository.sumAmountByWalletAccountIdAndStatusIn(
                account.getId(), OPEN_PAYOUT_STATUSES);
        if (openPayouts == null)
            openPayouts = BigDecimal.ZERO;
        BigDecimal available = account.getBalance().subtract(openPayouts);
        if (amount.compareTo(available) > 0) {
            throw new UnprocessableEntityException(
                    ErrorCode.INSUFFICIENT_BALANCE,
                    "Requested payout exceeds available wallet balance.");
        }

        Payout payout = payoutRepository
                .saveAndFlush(Payout.request(account.getId(), amount, request.accountHolderName(),
                        request.accountNumber(), request.ifscCode(), request.bankName()));

        ledgerEntryRepository.save(com.foodie.wallet.entity.LedgerEntry.debit(
                account.getId(), amount, com.foodie.common.enums.LedgerReferenceType.PAYOUT, payout.getId()));

        PayoutResponseDto response = WalletMapper.toPayout(payout);
        eventPublisher.publishEvent(PayoutRequestedEvent.of(
                payout.getId(), account.getId(), restaurantId, amount));

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            payoutIdempotencyStore.store(idempotencyKey.trim(), response);
        }
        return response;
    }

    private UUID requirePartnerId(UUID userCredentialId) {
        return deliveryPartnerLookup.findPartnerIdByUserCredentialId(userCredentialId)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery partner profile not found."));
    }

    private UUID requireRestaurantId(UUID ownerCredentialId) {
        return restaurantRepository.findByOwnerUserCredentialId(ownerCredentialId)
                .map(Restaurant::getId)
                .orElseThrow(() -> new ResourceNotFoundException("Restaurant profile not found."));
    }

    private void validateOwner(OwnerType ownerType, UUID ownerId) {
        if (ownerType == OwnerType.DELIVERY_PARTNER && !deliveryPartnerLookup.existsById(ownerId)) {
            throw new ResourceNotFoundException("Delivery partner not found for wallet credit.");
        }
        if (ownerType == OwnerType.RESTAURANT && !restaurantRepository.existsById(ownerId)) {
            throw new ResourceNotFoundException("Restaurant not found for wallet credit.");
        }
        if (ownerType == OwnerType.PLATFORM && !WalletConstants.PLATFORM_OWNER_ID.equals(ownerId)) {
            throw new BadRequestException(
                    ErrorCode.VALIDATION_FAILED, "Invalid PLATFORM wallet owner id.");
        }
    }

    private void validateAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED, "Amount must be greater than zero.");
        }
    }

    private WalletAccount findOrDefault(OwnerType ownerType, UUID ownerId) {
        return walletAccountRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId)
                .orElseGet(() -> {
                    WalletAccount account = WalletAccount.open(ownerType, ownerId);
                    if (ownerType == OwnerType.DELIVERY_PARTNER) {
                        account.setBalance(new BigDecimal("2000.00"));
                    }
                    return account;
                });
    }

    private WalletAccount getOrCreate(OwnerType ownerType, UUID ownerId) {
        return walletAccountRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId)
                .orElseGet(() -> {
                    try {
                        WalletAccount account = WalletAccount.open(ownerType, ownerId);
                        if (ownerType == OwnerType.DELIVERY_PARTNER) {
                            account.setBalance(new BigDecimal("2000.00"));
                        }
                        account = walletAccountRepository.save(account);
                        if (ownerType == OwnerType.DELIVERY_PARTNER) {
                            ledgerEntryRepository.save(LedgerEntry.credit(
                                    account.getId(),
                                    new BigDecimal("2000.00"),
                                    LedgerReferenceType.INCENTIVE,
                                    account.getId()));
                        }
                        return account;
                    } catch (Exception ex) {
                        return walletAccountRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId)
                                .orElseGet(() -> {
                                    WalletAccount fallback = WalletAccount.open(ownerType, ownerId);
                                    if (ownerType == OwnerType.DELIVERY_PARTNER) {
                                        fallback.setBalance(new BigDecimal("2000.00"));
                                    }
                                    return fallback;
                                });
                    }
                });
    }

    private WalletAccount getOrCreateForUpdate(OwnerType ownerType, UUID ownerId) {
        return walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(ownerType, ownerId)
                .orElseGet(() -> {
                    try {
                        WalletAccount account = WalletAccount.open(ownerType, ownerId);
                        if (ownerType == OwnerType.DELIVERY_PARTNER) {
                            account.setBalance(new BigDecimal("2000.00"));
                        }
                        account = walletAccountRepository.save(account);
                        if (ownerType == OwnerType.DELIVERY_PARTNER) {
                            ledgerEntryRepository.save(LedgerEntry.credit(
                                    account.getId(),
                                    new BigDecimal("2000.00"),
                                    LedgerReferenceType.INCENTIVE,
                                    account.getId()));
                        }
                        return account;
                    } catch (Exception ex) {
                        return walletAccountRepository.findByOwnerTypeAndOwnerIdForUpdate(ownerType, ownerId)
                                .orElseGet(() -> {
                                    WalletAccount fallback = WalletAccount.open(ownerType, ownerId);
                                    if (ownerType == OwnerType.DELIVERY_PARTNER) {
                                        fallback.setBalance(new BigDecimal("2000.00"));
                                    }
                                    return fallback;
                                });
                    }
                });
    }

    private BigDecimal calculateTrueRestaurantBalance(UUID restaurantId, UUID walletAccountId) {
        BigDecimal totalEarning = BigDecimal.ZERO;
        List<com.foodie.order.entity.Order> orders = orderRepository.findByRestaurantId(restaurantId);
        Restaurant restaurant = restaurantRepository.findById(restaurantId).orElse(null);
        BigDecimal commissionPct = restaurant != null && restaurant.getCommissionPct() != null
                ? restaurant.getCommissionPct()
                : BigDecimal.ZERO;

        for (com.foodie.order.entity.Order order : orders) {
            com.foodie.common.enums.OrderStatus status = order.getStatus();
            if (status == com.foodie.common.enums.OrderStatus.DELIVERED
                    || status == com.foodie.common.enums.OrderStatus.PICKED_UP
                    || status == com.foodie.common.enums.OrderStatus.OUT_FOR_DELIVERY) {
                if (order.getTotalAmount() != null) {
                    BigDecimal dFee = order.getDeliveryFee() != null ? order.getDeliveryFee() : BigDecimal.ZERO;
                    BigDecimal earning = order.getTotalAmount().subtract(dFee);
                    BigDecimal comm = earning.multiply(commissionPct).divide(new BigDecimal("100"), 2,
                            RoundingMode.HALF_UP);
                    totalEarning = totalEarning.add(earning.subtract(comm));
                }
            }
        }

        BigDecimal allPayouts = BigDecimal.ZERO;
        if (walletAccountId != null) {
            allPayouts = payoutRepository.sumAmountByWalletAccountIdAndStatusIn(walletAccountId,
                    EnumSet.of(PayoutStatus.REQUESTED, PayoutStatus.PROCESSING, PayoutStatus.COMPLETED));
            if (allPayouts == null)
                allPayouts = BigDecimal.ZERO;
        }

        return totalEarning.subtract(allPayouts).setScale(2, RoundingMode.HALF_UP);
    }

    private static int clampSize(int size) {
        if (size <= 0) {
            return 20;
        }
        return Math.min(size, 100);
    }

    private static Sort resolveSort(String sort) {
        if (sort == null || sort.isBlank() || "createdAt".equals(sort) || "-createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.DESC, "createdAt");
        }
        if ("+createdAt".equals(sort)) {
            return Sort.by(Sort.Direction.ASC, "createdAt");
        }
        throw new BadRequestException(
                ErrorCode.INVALID_SORT_FIELD, "Allowed sort fields: createdAt.");
    }
}
