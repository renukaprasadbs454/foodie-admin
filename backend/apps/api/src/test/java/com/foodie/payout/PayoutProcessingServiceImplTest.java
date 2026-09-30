package com.foodie.payout;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.foodie.common.enums.LedgerReferenceType;
import com.foodie.common.enums.OwnerType;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.exception.BadRequestException;
import com.foodie.payment.service.WebhookDedupService;
import com.foodie.payout.dto.PayoutExecutionResult;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.provider.PayoutProvider;
import com.foodie.payout.provider.PayoutProviderRouter;
import com.foodie.payout.service.impl.PayoutProcessingServiceImpl;
import com.foodie.shared.event.PayoutCompletedEvent;
import com.foodie.shared.event.PayoutFailedEvent;
import com.foodie.wallet.entity.Payout;
import com.foodie.wallet.entity.WalletAccount;
import com.foodie.wallet.repository.PayoutRepository;
import com.foodie.wallet.repository.WalletAccountRepository;
import com.foodie.wallet.service.WalletService;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class PayoutProcessingServiceImplTest {

    @Mock
    private PayoutRepository payoutRepository;
    @Mock
    private WalletAccountRepository walletAccountRepository;
    @Mock
    private WalletService walletService;
    @Mock
    private PayoutProviderRouter providerRouter;
    @Mock
    private PayoutProvider razorpayProvider;
    @Mock
    private PayoutProvider cashfreeProvider;
    @Mock
    private WebhookDedupService webhookDedupService;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private ObjectMapper objectMapper;
    private PayoutProcessingServiceImpl service;

    private final UUID partnerId = UUID.randomUUID();
    private final UUID walletAccountId = UUID.randomUUID();
    private WalletAccount walletAccount;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        service = new PayoutProcessingServiceImpl(
                payoutRepository,
                walletAccountRepository,
                walletService,
                providerRouter,
                webhookDedupService,
                objectMapper,
                eventPublisher
        );
        walletAccount = WalletAccount.open(OwnerType.DELIVERY_PARTNER, partnerId);
    }

    @Test
    void processPayout_withRazorpay_transitionsToProcessing() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("500.00"), "Alice", "1234567890", "HDFC0001234", "HDFC");
        when(payoutRepository.findById(payout.getId())).thenReturn(Optional.of(payout));
        when(providerRouter.getActiveProvider()).thenReturn(razorpayProvider);
        when(razorpayProvider.getProviderType()).thenReturn(PayoutProviderType.RAZORPAY);
        when(razorpayProvider.executePayout(eq(payout), any()))
                .thenReturn(PayoutExecutionResult.processing("pout_12345", null, "processing"));

        PayoutExecutionResult result = service.processPayout(payout.getId(), "idem-key-1");

        assertThat(result.mappedStatus()).isEqualTo(PayoutStatus.PROCESSING);
        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.PROCESSING);
        assertThat(payout.getProvider()).isEqualTo("RAZORPAY");
        assertThat(payout.getProviderPayoutId()).isEqualTo("pout_12345");
        verify(payoutRepository).save(payout);
        verify(walletService, never()).debit(any(), any(), any(), any(), any());
    }

    @Test
    void processPayout_withCashfree_synchronousFailure_marksFailedAndReleasesReserved() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("300.00"), "Bob", "9876543210", "SBIN0001234", "SBI");
        when(payoutRepository.findById(payout.getId())).thenReturn(Optional.of(payout));
        when(walletAccountRepository.findById(walletAccountId)).thenReturn(Optional.of(walletAccount));
        when(providerRouter.getActiveProvider()).thenReturn(cashfreeProvider);
        when(cashfreeProvider.getProviderType()).thenReturn(PayoutProviderType.CASHFREE);
        when(cashfreeProvider.executePayout(eq(payout), any()))
                .thenReturn(PayoutExecutionResult.failed("CF_999", "REJECTED", "Invalid IFSC code"));

        PayoutExecutionResult result = service.processPayout(payout.getId(), "idem-key-2");

        assertThat(result.mappedStatus()).isEqualTo(PayoutStatus.FAILED);
        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.FAILED);
        assertThat(payout.getFailureReason()).isEqualTo("Invalid IFSC code");
        verify(payoutRepository).save(payout);
        verify(walletService, never()).debit(any(), any(), any(), any(), any());
        verify(eventPublisher).publishEvent(any(PayoutFailedEvent.class));
    }

    @Test
    void handleRazorpayWebhook_successEvent_completesAndDebitsWallet() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("450.00"), "Charlie", "1122334455", "ICIC0001234", "ICICI");
        payout.markProcessing("RAZORPAY", "pout_rzp_99", null, "processing");

        String rawBody = """
                {
                  "id": "evt_rzp_success_1",
                  "event": "payout.processed",
                  "payload": {
                    "payout": {
                      "entity": {
                        "id": "pout_rzp_99",
                        "status": "processed",
                        "utr": "UTR123456789",
                        "notes": {
                          "payoutId": "%s"
                        }
                      }
                    }
                  }
                }
                """.formatted(payout.getId());

        when(providerRouter.getProvider(PayoutProviderType.RAZORPAY)).thenReturn(razorpayProvider);
        when(razorpayProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(true);
        when(webhookDedupService.isDuplicate("evt_rzp_success_1")).thenReturn(false);
        when(payoutRepository.findByProviderPayoutId("pout_rzp_99")).thenReturn(Optional.of(payout));
        when(walletAccountRepository.findById(walletAccountId)).thenReturn(Optional.of(walletAccount));

        service.handleWebhook(PayoutProviderType.RAZORPAY, rawBody, Map.of("X-Razorpay-Signature", "sig_valid"));

        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.COMPLETED);
        assertThat(payout.getBankRef()).isEqualTo("UTR123456789");
        assertThat(payout.getCompletedAt()).isNotNull();

        verify(walletService).debit(
                OwnerType.DELIVERY_PARTNER,
                partnerId,
                new BigDecimal("450.00"),
                LedgerReferenceType.PAYOUT,
                payout.getId()
        );
        verify(webhookDedupService).markProcessed("evt_rzp_success_1");
        verify(eventPublisher).publishEvent(any(PayoutCompletedEvent.class));
    }

    @Test
    void handleRazorpayWebhook_failedEvent_marksFailed() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("200.00"), "David", "5566778899", "KKBK0001234", "Kotak");
        payout.markProcessing("RAZORPAY", "pout_rzp_fail", null, "processing");

        String rawBody = """
                {
                  "id": "evt_rzp_fail_1",
                  "event": "payout.failed",
                  "payload": {
                    "payout": {
                      "entity": {
                        "id": "pout_rzp_fail",
                        "status": "failed",
                        "failure_reason": "Account closed or invalid",
                        "notes": {
                          "payoutId": "%s"
                        }
                      }
                    }
                  }
                }
                """.formatted(payout.getId());

        when(providerRouter.getProvider(PayoutProviderType.RAZORPAY)).thenReturn(razorpayProvider);
        when(razorpayProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(true);
        when(webhookDedupService.isDuplicate("evt_rzp_fail_1")).thenReturn(false);
        when(payoutRepository.findByProviderPayoutId("pout_rzp_fail")).thenReturn(Optional.of(payout));
        when(walletAccountRepository.findById(walletAccountId)).thenReturn(Optional.of(walletAccount));

        service.handleWebhook(PayoutProviderType.RAZORPAY, rawBody, Map.of("X-Razorpay-Signature", "sig_valid"));

        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.FAILED);
        assertThat(payout.getFailureReason()).isEqualTo("Account closed or invalid");

        verify(walletService, never()).debit(any(), any(), any(), any(), any());
        verify(webhookDedupService).markProcessed("evt_rzp_fail_1");
        verify(eventPublisher).publishEvent(any(PayoutFailedEvent.class));
    }

    @Test
    void handleCashfreeWebhook_successEvent_completesAndDebitsWallet() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("700.00"), "Eve", "3344556677", "PUNB0001234", "PNB");
        payout.markProcessing("CASHFREE", "CF_transfer_123", null, "PENDING");

        String rawBody = """
                {
                  "eventTime": "2026-08-25T10:00:00Z",
                  "transferId": "CF_transfer_123",
                  "status": "SUCCESS",
                  "referenceId": "CF_REF_888",
                  "utr": "UTR_CF_9999"
                }
                """;

        when(providerRouter.getProvider(PayoutProviderType.CASHFREE)).thenReturn(cashfreeProvider);
        when(cashfreeProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(true);
        when(webhookDedupService.isDuplicate("2026-08-25T10:00:00Z")).thenReturn(false);
        when(payoutRepository.findByProviderPayoutId("CF_transfer_123")).thenReturn(Optional.of(payout));
        when(walletAccountRepository.findById(walletAccountId)).thenReturn(Optional.of(walletAccount));

        service.handleWebhook(PayoutProviderType.CASHFREE, rawBody, Map.of("X-Cf-Signature", "cf_sig_valid"));

        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.COMPLETED);
        assertThat(payout.getBankRef()).isEqualTo("CF_REF_888");

        verify(walletService).debit(
                OwnerType.DELIVERY_PARTNER,
                partnerId,
                new BigDecimal("700.00"),
                LedgerReferenceType.PAYOUT,
                payout.getId()
        );
        verify(webhookDedupService).markProcessed("2026-08-25T10:00:00Z");
    }

    @Test
    void handleCashfreeWebhook_failedEvent_marksFailed() {
        Payout payout = Payout.request(walletAccountId, new BigDecimal("350.00"), "Frank", "6677889900", "BARB0001234", "BOB");
        payout.markProcessing("CASHFREE", "CF_transfer_failed", null, "PENDING");

        String rawBody = """
                {
                  "eventTime": "2026-08-25T10:05:00Z",
                  "transferId": "CF_transfer_failed",
                  "status": "FAILED",
                  "reason": "Beneficiary name mismatch"
                }
                """;

        when(providerRouter.getProvider(PayoutProviderType.CASHFREE)).thenReturn(cashfreeProvider);
        when(cashfreeProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(true);
        when(webhookDedupService.isDuplicate("2026-08-25T10:05:00Z")).thenReturn(false);
        when(payoutRepository.findByProviderPayoutId("CF_transfer_failed")).thenReturn(Optional.of(payout));
        when(walletAccountRepository.findById(walletAccountId)).thenReturn(Optional.of(walletAccount));

        service.handleWebhook(PayoutProviderType.CASHFREE, rawBody, Map.of("X-Cf-Signature", "cf_sig_valid"));

        assertThat(payout.getStatus()).isEqualTo(PayoutStatus.FAILED);
        assertThat(payout.getFailureReason()).isEqualTo("Beneficiary name mismatch");
        verify(walletService, never()).debit(any(), any(), any(), any(), any());
    }

    @Test
    void handleWebhook_duplicateEvent_isIgnored() {
        String rawBody = """
                {
                  "id": "evt_duplicate_1",
                  "event": "payout.processed",
                  "payload": {
                    "payout": {
                      "entity": {
                        "id": "pout_dup"
                      }
                    }
                  }
                }
                """;

        when(providerRouter.getProvider(PayoutProviderType.RAZORPAY)).thenReturn(razorpayProvider);
        when(razorpayProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(true);
        when(webhookDedupService.isDuplicate("evt_duplicate_1")).thenReturn(true);

        service.handleWebhook(PayoutProviderType.RAZORPAY, rawBody, Map.of("X-Razorpay-Signature", "sig"));

        verify(payoutRepository, never()).findByProviderPayoutId(any());
        verify(walletService, never()).debit(any(), any(), any(), any(), any());
    }

    @Test
    void handleWebhook_invalidSignature_throwsBadRequest() {
        when(providerRouter.getProvider(PayoutProviderType.RAZORPAY)).thenReturn(razorpayProvider);
        when(razorpayProvider.verifyWebhookSignature(anyString(), anyMap())).thenReturn(false);

        assertThatThrownBy(() -> service.handleWebhook(PayoutProviderType.RAZORPAY, "{}", Map.of()))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Invalid webhook signature");
    }
}
