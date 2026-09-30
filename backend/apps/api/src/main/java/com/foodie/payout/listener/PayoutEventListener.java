package com.foodie.payout.listener;

import com.foodie.payout.service.PayoutProcessingService;
import com.foodie.shared.event.PayoutRequestedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class PayoutEventListener {

    private static final Logger log = LoggerFactory.getLogger(PayoutEventListener.class);

    private final PayoutProcessingService payoutProcessingService;

    public PayoutEventListener(PayoutProcessingService payoutProcessingService) {
        this.payoutProcessingService = payoutProcessingService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onPayoutRequested(PayoutRequestedEvent event) {
        log.info("Handling PayoutRequestedEvent payoutId={} partnerId={} amount={}",
                event.payoutId(), event.deliveryPartnerId(), event.amount());
        try {
            // payoutProcessingService.processPayout(event.payoutId(), null);
            // Auto-processing removed. Payouts now stay in REQUESTED state
            // and must be manually approved via the Admin Panel.
            log.info("Payout {} registered and awaiting admin approval.", event.payoutId());
        } catch (Exception ex) {
            log.error("Failed to process payout {} asynchronously", event.payoutId(), ex);
        }
    }
}
