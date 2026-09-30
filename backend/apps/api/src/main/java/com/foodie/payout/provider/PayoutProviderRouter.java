package com.foodie.payout.provider;

import com.foodie.payout.config.PayoutProperties;
import com.foodie.payout.enums.PayoutProviderType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class PayoutProviderRouter {

    private static final Logger log = LoggerFactory.getLogger(PayoutProviderRouter.class);

    private final PayoutProperties properties;
    private final Map<PayoutProviderType, PayoutProvider> providers = new EnumMap<>(PayoutProviderType.class);

    public PayoutProviderRouter(PayoutProperties properties, List<PayoutProvider> providerList) {
        this.properties = properties;
        for (PayoutProvider p : providerList) {
            providers.put(p.getProviderType(), p);
        }
        log.info("Initialized PayoutProviderRouter with providers: {}", providers.keySet());
    }

    public PayoutProvider getActiveProvider() {
        PayoutProviderType type = PayoutProviderType.fromString(properties.getProvider());
        PayoutProvider provider = providers.get(type);
        if (provider == null) {
            log.warn("Configured provider {} not found in registry, falling back to RAZORPAY", type);
            return providers.getOrDefault(PayoutProviderType.RAZORPAY, providers.values().iterator().next());
        }
        return provider;
    }

    public PayoutProvider getProvider(PayoutProviderType type) {
        return providers.get(type);
    }
}
