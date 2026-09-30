package com.foodie.payout.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.common.exception.ErrorCode;
import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.payment.service.WebhookDedupService;
import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.provider.PayoutProvider;
import com.foodie.payout.provider.PayoutProviderRouter;
import com.foodie.payout.provider.cashfree.CashfreePayoutProvider;
import com.foodie.payout.provider.razorpay.RazorpayPayoutProvider;
import com.foodie.payout.service.PayoutProcessingService;
import com.foodie.shared.event.PayoutCompletedEvent;
import com.foodie.shared.event.PayoutFailedEvent;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.WalletService;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayoutProcessingServiceImpl implements PayoutProcessingService {

    private static final Logger log = LoggerFactory.getLogger(PayoutProcessingServiceImpl.class);

    private final PayoutRepository payoutRepository;
    private final WalletAccountRepository walletAccountRepository;
    private final WalletService walletService;
    private final PayoutProviderRouter providerRouter;
    private final WebhookDedupService webhookDedupService;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    public PayoutProcessingServiceImpl(
            PayoutRepository payoutRepository,
            WalletAccountRepository walletAccountRepository,
            WalletService walletService,
            PayoutProviderRouter providerRouter,
            WebhookDedupService webhookDedupService,
            ObjectMapper objectMapper,
            ApplicationEventPublisher eventPublisher) {
        this.payoutRepository = payoutRepository;
        this.walletAccountRepository = walletAccountRepository;
        this.walletService = walletService;
        this.providerRouter = providerRouter;
        this.webhookDedupService = webhookDedupService;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
    }

    @Override
    @Transactional
    public PayoutExecutionResult processPayout(UUID payoutId, String idempotencyKey) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));

        if (payout.getStatus() == PayoutStatus.COMPLETED) {
            log.info("Payout {} already in terminal status {}", payoutId, payout.getStatus());
            return new PayoutExecutionResult(
                    payout.getProviderPayoutId(),
                    payout.getProviderReferenceId(),
                    payout.getProviderStatus(),
                    payout.getStatus(),
                    payout.getFailureReason(),
                    false);
        }

        PayoutProvider provider = providerRouter.getActiveProvider();
        log.info("Sending payout {} amount {} to provider {}", payoutId, payout.getAmount(),
                provider.getProviderType());

        PayoutExecutionResult result = provider.executePayout(payout, idempotencyKey);

        payout.markProcessing(
                provider.getProviderType().name(),
                result.providerPayoutId(),
                result.providerReferenceId(),
                result.providerStatus());

        if (result.mappedStatus() == PayoutStatus.COMPLETED) {
            settleCompleted(payout, result.providerReferenceId(), result.providerStatus());
        } else if (result.mappedStatus() == PayoutStatus.FAILED) {
            settleFailed(payout, result.failureReason(), result.providerStatus());
        } else {
            payoutRepository.save(payout);
        }

        return result;
    }

    @Override
    @Transactional
    public void handleWebhook(PayoutProviderType providerType, String rawBody, Map<String, String> headers) {
        PayoutProvider provider = providerRouter.getProvider(providerType);
        if (provider == null) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Unsupported provider: " + providerType);
        }

        if (!provider.verifyWebhookSignature(rawBody, headers)) {
            log.warn("Invalid webhook signature for provider {}", providerType);
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Invalid webhook signature.");
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(rawBody);
        } catch (Exception ex) {
            throw new BadRequestException(ErrorCode.BAD_REQUEST, "Malformed webhook payload.");
        }

        if (providerType == PayoutProviderType.RAZORPAY) {
            handleRazorpayWebhook(root);
        } else if (providerType == PayoutProviderType.CASHFREE) {
            handleCashfreeWebhook(root);
        }
    }

    @Override
    @Transactional
    public void checkAndUpdateStatus(UUID payoutId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new ResourceNotFoundException("Payout not found: " + payoutId));

        if (payout.getStatus() != PayoutStatus.PROCESSING || payout.getProviderPayoutId() == null) {
            return;
        }

        PayoutProviderType providerType = PayoutProviderType.fromString(payout.getProvider());
        PayoutProvider provider = providerRouter.getProvider(providerType);
        if (provider == null) {
            return;
        }

        var statusResult = provider.checkPayoutStatus(payout.getProviderPayoutId());
        if (statusResult.mappedStatus() == PayoutStatus.COMPLETED) {
            settleCompleted(payout, statusResult.providerReferenceId(), statusResult.providerStatus());
        } else if (statusResult.mappedStatus() == PayoutStatus.FAILED) {
            settleFailed(payout, statusResult.failureReason(), statusResult.providerStatus());
        }
    }

    private void handleRazorpayWebhook(JsonNode root) {
        String eventId = root.path("id").asText(root.path("event_id").asText(null));
        if (eventId != null && webhookDedupService.isDuplicate(eventId)) {
            log.info("Duplicate Razorpay payout webhook ignored eventId={}", eventId);
            return;
        }

        String eventType = root.path("event").asText("");
        JsonNode entity = root.path("payload").path("payout").path("entity");
        String providerPayoutId = entity.path("id").asText(null);
        String rawStatus = entity.path("status").asText("");
        String utr = entity.path("utr").asText(null);
        String failureReason = entity.path("failure_reason").asText(null);
        String notesPayoutId = entity.path("notes").path("payoutId").asText(null);

        log.info("Processing Razorpay payout webhook event={} payoutId={} providerPayoutId={} status={}",
                eventType, notesPayoutId, providerPayoutId, rawStatus);

        Payout payout = findPayout(providerPayoutId, notesPayoutId);
        if (payout == null) {
            log.warn("Payout not found for Razorpay webhook: providerPayoutId={} notesPayoutId={}",
                    providerPayoutId, notesPayoutId);
            if (eventId != null)
                webhookDedupService.markProcessed(eventId);
            return;
        }

        if (payout.getStatus() == PayoutStatus.COMPLETED || payout.getStatus() == PayoutStatus.FAILED) {
            log.info("Payout {} already in terminal state {}, ignoring webhook", payout.getId(), payout.getStatus());
            if (eventId != null)
                webhookDedupService.markProcessed(eventId);
            return;
        }

        PayoutStatus mapped = RazorpayPayoutProvider.mapRazorpayStatus(rawStatus);
        if (mapped == PayoutStatus.COMPLETED) {
            settleCompleted(payout, utr, rawStatus);
        } else if (mapped == PayoutStatus.FAILED) {
            settleFailed(payout, failureReason != null ? failureReason : "Razorpay payout failed (" + rawStatus + ")",
                    rawStatus);
        }

        if (eventId != null) {
            webhookDedupService.markProcessed(eventId);
        }
    }

    private void handleCashfreeWebhook(JsonNode root) {
        String eventId = root.path("eventTime").asText(root.path("transferId").asText(null));
        if (eventId != null && webhookDedupService.isDuplicate(eventId)) {
            log.info("Duplicate Cashfree payout webhook ignored eventId={}", eventId);
            return;
        }

        JsonNode data = root.has("data") ? root.path("data") : root;
        String transferId = data.path("transferId").asText(root.path("transferId").asText(null));
        String rawStatus = data.path("status").asText(root.path("status").asText(""));
        String referenceId = data.path("referenceId").asText(data.path("utr").asText(null));
        String failureReason = data.path("reason").asText(root.path("message").asText(null));

        log.info("Processing Cashfree payout webhook transferId={} status={}", transferId, rawStatus);

        Payout payout = findPayout(transferId, null);
        if (payout == null) {
            log.warn("Payout not found for Cashfree webhook: transferId={}", transferId);
            if (eventId != null)
                webhookDedupService.markProcessed(eventId);
            return;
        }

        if (payout.getStatus() == PayoutStatus.COMPLETED || payout.getStatus() == PayoutStatus.FAILED) {
            log.info("Payout {} already in terminal state {}, ignoring webhook", payout.getId(), payout.getStatus());
            if (eventId != null)
                webhookDedupService.markProcessed(eventId);
            return;
        }

        PayoutStatus mapped = CashfreePayoutProvider.mapCashfreeStatus(rawStatus);
        if (mapped == PayoutStatus.COMPLETED) {
            settleCompleted(payout, referenceId, rawStatus);
        } else if (mapped == PayoutStatus.FAILED) {
            settleFailed(payout, failureReason != null ? failureReason : "Cashfree payout failed (" + rawStatus + ")",
                    rawStatus);
        }

        if (eventId != null) {
            webhookDedupService.markProcessed(eventId);
        }
    }

    private Payout findPayout(String providerPayoutId, String internalPayoutIdStr) {
        if (providerPayoutId != null && !providerPayoutId.isBlank()) {
            var byProviderId = payoutRepository.findByProviderPayoutId(providerPayoutId);
            if (byProviderId.isPresent()) {
                return byProviderId.get();
            }
        }
        if (internalPayoutIdStr != null && !internalPayoutIdStr.isBlank()) {
            try {
                UUID id = UUID.fromString(internalPayoutIdStr.trim());
                return payoutRepository.findById(id).orElse(null);
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private void settleCompleted(Payout payout, String referenceId, String rawStatus) {
        payout.markCompleted(referenceId, rawStatus);
        payoutRepository.save(payout);

        WalletAccount account = walletAccountRepository.findById(payout.getWalletAccountId()).orElse(null);
        if (account != null) {
            log.info("Debiting wallet {} for completed payout {} amount {}",
                    account.getId(), payout.getId(), payout.getAmount());
            walletService.debit(
                    OwnerType.DELIVERY_PARTNER,
                    account.getOwnerId(),
                    payout.getAmount(),
                    LedgerReferenceType.PAYOUT,
                    payout.getId());

            eventPublisher.publishEvent(PayoutCompletedEvent.of(
                    payout.getId(),
                    account.getId(),
                    account.getOwnerId(),
                    payout.getAmount(),
                    payout.getProvider(),
                    payout.getProviderPayoutId(),
                    referenceId));
        }
    }

    private void settleFailed(Payout payout, String failureReason, String rawStatus) {
        payout.markFailed(failureReason, rawStatus);
        payoutRepository.save(payout);

        WalletAccount account = walletAccountRepository.findById(payout.getWalletAccountId()).orElse(null);
        if (account != null) {
            log.info("Payout {} FAILED. Reserved balance released automatically for wallet {}. Reason: {}",
                    payout.getId(), account.getId(), failureReason);

            eventPublisher.publishEvent(PayoutFailedEvent.of(
                    payout.getId(),
                    account.getId(),
                    account.getOwnerId(),
                    payout.getAmount(),
                    payout.getProvider(),
                    failureReason));
        }
    }
}
