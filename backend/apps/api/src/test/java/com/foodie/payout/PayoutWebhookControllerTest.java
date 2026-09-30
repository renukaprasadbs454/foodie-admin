package com.foodie.payout;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.foodie.payout.controller.PayoutWebhookController;
import com.foodie.payout.enums.PayoutProviderType;
import com.foodie.payout.service.PayoutProcessingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class PayoutWebhookControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PayoutProcessingService payoutProcessingService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new PayoutWebhookController(payoutProcessingService)).build();
    }

    @Test
    void razorpayWebhookEndpoint_invokesService() throws Exception {
        String body = "{\"event\":\"payout.processed\"}";

        mockMvc.perform(post("/api/v1/payouts/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("X-Razorpay-Signature", "sig123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(payoutProcessingService).handleWebhook(eq(PayoutProviderType.RAZORPAY), eq(body), anyMap());
    }

    @Test
    void cashfreeWebhookEndpoint_invokesService() throws Exception {
        String body = "{\"status\":\"SUCCESS\",\"transferId\":\"CF_1\"}";

        mockMvc.perform(post("/api/v1/payouts/webhook/cashfree")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("X-Cf-Signature", "cfsig123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(payoutProcessingService).handleWebhook(eq(PayoutProviderType.CASHFREE), eq(body), anyMap());
    }
}
