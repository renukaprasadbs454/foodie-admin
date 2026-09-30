package com.foodie.infrastructure.fcm;

import com.foodie.common.exception.ExternalServiceException;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Live FCM adapter placeholder. Real HTTP/gRPC wiring requires service-account
 * credentials
 * injected at runtime (never committed). Until credentials are configured,
 * throws retryable
 * unavailable so RetryingFcmClient / callers mark delivery FAILED safely.
 */
public class LiveFcmClient implements FcmClient {

    private static final Logger log = LoggerFactory.getLogger(LiveFcmClient.class);

    private final FcmProperties properties;

    public LiveFcmClient(FcmProperties properties) {
        this.properties = properties;
    }

    @Override
    public FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body) {
        if (deviceToken == null || deviceToken.isBlank()) {
            throw new ExternalServiceException("FCM device token missing for user.");
        }

        if (deviceToken.startsWith("ExponentPushToken") || deviceToken.startsWith("ExpoPushToken")) {
            try {
                java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
                String payload = String.format(
                        "{\"to\":\"%s\",\"title\":\"%s\",\"body\":\"%s\",\"sound\":\"default\",\"priority\":\"high\",\"badge\":1}",
                        deviceToken,
                        title.replace("\"", "\\\""),
                        body.replace("\"", "\\\""));
                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create("https://exp.host/--/api/v2/push/send"))
                        .header("Content-Type", "application/json")
                        .POST(java.net.http.HttpRequest.BodyPublishers.ofString(payload))
                        .build();

                java.net.http.HttpResponse<String> response = client.send(
                        request, java.net.http.HttpResponse.BodyHandlers.ofString());

                log.info("Expo Push Delivery Response for user {}: {}", userCredentialId, response.body());
                return new FcmSendResult(true, "expo_" + System.currentTimeMillis());
            } catch (Exception ex) {
                log.error("Expo push network/API failure for user {}: {}", userCredentialId, ex.getMessage());
                throw new ExternalServiceException("Expo Push failed: " + ex.getMessage());
            }
        }

        throw new ExternalServiceException("Unsupported device token format: " + deviceToken);
    }
}
