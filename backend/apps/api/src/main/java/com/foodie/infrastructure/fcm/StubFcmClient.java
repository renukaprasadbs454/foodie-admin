package com.foodie.infrastructure.fcm;

import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class StubFcmClient implements FcmClient {

    private static final Logger log = LoggerFactory.getLogger(StubFcmClient.class);

    @Override
    public FcmSendResult sendPush(UUID userCredentialId, String deviceToken, String title, String body) {
        if (deviceToken != null
                && (deviceToken.startsWith("ExponentPushToken") || deviceToken.startsWith("ExpoPushToken"))) {
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
                log.info("Stub-bypassed real Expo Push Response for {}: {}", userCredentialId, response.body());
            } catch (Exception ex) {
                log.error("Expo push network/API failure for user {}: {}", userCredentialId, ex.getMessage());
            }
        } else {
            log.info("STUB FCM (NoOp): Sending push to user={} token={} title='{}'",
                    userCredentialId, deviceToken, title);
        }
        return new FcmSendResult(true, "stub_fcm_" + UUID.randomUUID());
    }
}
