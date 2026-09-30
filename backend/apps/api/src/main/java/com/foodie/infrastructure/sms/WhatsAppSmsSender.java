package com.foodie.infrastructure.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Primary
@Component
public class WhatsAppSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppSmsSender.class);

    private final RestTemplate restTemplate;

    @Value("${foodie.whatsapp.api-url:${whatsapp.api-url:https://graph.facebook.com/v20.0}}")
    private String apiUrl;

    @Value("${foodie.whatsapp.phone-number-id:${whatsapp.phone-number-id:1221588944380691}}")
    private String phoneNumberId;

    @Value("${foodie.whatsapp.access-token:${whatsapp.access-token:EAAWQPzK10nEBSSDfEircdRcZB0HKL7YH9pJnmyKGGQUkJWA5vc4iEMZC1c7f85tRUwcoy1ktTFh6sy3q2ZApAZCjHFCkhtIJPwdKishqu0ZBnZBJCWTssHAaF9cfIa0k1OIiFf8WhGQKZB7MEhMXgGt8A8H46JMseHFUr9jOZBKaoZAy97WKAXdRTVkYjf4V44dOAhv7XOpKd74ldJNmT347cULqZCSQQh3vM5eclizdbFCZCHBRZBRNXDlUFUn7DtOHxTCYMlz79Q2qMd3msjGjcvWRAGdOj9M5ZC0GgJv1gYQZDZD}}")
    private String accessToken;

    public WhatsAppSmsSender() {
        this.restTemplate = new RestTemplate();
    }

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        log.info("Dispatching WhatsApp OTP to phone: {}", phoneNumber);

        try {
            // Remove + from phone if present, WhatsApp API expects clean country code
            String formattedPhone = phoneNumber.replaceAll("[^0-9]", "");

            String url = String.format("%s/%s/messages", apiUrl, phoneNumberId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);

            // Constructing WhatsApp JSON Payload for standard OTP template
            String payload = String.format(
                    """
                            {
                              "messaging_product": "whatsapp",
                              "to": "%s",
                              "type": "template",
                              "template": {
                                "name": "login_otp",
                                "language": {
                                  "code": "en_US"
                                },
                                "components": [
                                  {
                                    "type": "body",
                                    "parameters": [
                                      {
                                        "type": "text",
                                        "text": "%s"
                                      }
                                    ]
                                  }
                                ]
                              }
                            }
                            """,
                    formattedPhone, otp);

            HttpEntity<String> request = new HttpEntity<>(payload, headers);

            try {
                restTemplate.exchange(url, HttpMethod.POST, request, String.class);
                log.info("Successfully dispatched WhatsApp OTP template to {}", mask(formattedPhone));
                return;
            } catch (Exception templateEx) {
                String metaError = templateEx.getMessage();
                if (templateEx instanceof org.springframework.web.client.RestClientResponseException rce) {
                    metaError = rce.getResponseBodyAsString();
                }
                log.warn("WhatsApp template dispatch returned error: {}. Trying direct text message fallback...", metaError);

                String textPayload = String.format(
                        """
                                {
                                  "messaging_product": "whatsapp",
                                  "recipient_type": "individual",
                                  "to": "%s",
                                  "type": "text",
                                  "text": {
                                    "preview_url": false,
                                    "body": "Your Foodie verification code is: %s. Valid for 5 minutes."
                                  }
                                }
                                """,
                        formattedPhone, otp);

                HttpEntity<String> textRequest = new HttpEntity<>(textPayload, headers);
                restTemplate.exchange(url, HttpMethod.POST, textRequest, String.class);
                log.info("Successfully dispatched WhatsApp text OTP to {}", mask(formattedPhone));
            }

        } catch (Exception ex) {
            String metaError = ex.getMessage();
            if (ex instanceof org.springframework.web.client.RestClientResponseException rce) {
                metaError = rce.getResponseBodyAsString();
            }
            log.error("Failed to send WhatsApp OTP to {}: {}", mask(phoneNumber), metaError);
            log.info("Development fallback - active OTP code for {}: {}", phoneNumber, otp);
        }
    }

    private static String mask(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return phoneNumber.substring(0, 4) + "******" + phoneNumber.substring(phoneNumber.length() - 2);
    }
}
