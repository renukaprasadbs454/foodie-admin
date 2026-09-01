package com.foodie.admin.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.admin.dto.response.AdminDeliveryPayoutResponseDto;
import com.foodie.admin.dto.response.AdminPayoutDetailResponseDto;
import com.foodie.admin.dto.response.AdminPayoutReconciliationDto;
import com.foodie.admin.service.AdminDeliveryPayoutService;
import com.foodie.common.dto.ApiResponse;
import com.foodie.common.dto.PaginationMeta;
import com.foodie.common.enums.PayoutProvider;
import com.foodie.common.enums.PayoutStatus;
import com.foodie.common.enums.ReconciliationStatus;
import com.foodie.wallet.service.WalletService.PageResult;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

@ExtendWith(MockitoExtension.class)
class AdminDeliveryPayoutControllerTest {

    @Mock
    private AdminDeliveryPayoutService adminDeliveryPayoutService;

    private AdminDeliveryPayoutController controller;

    @BeforeEach
    void setUp() {
        controller = new AdminDeliveryPayoutController(adminDeliveryPayoutService);
    }

    @Test
    void listPayouts_returnsSuccessResponse() {
        UUID payoutId = UUID.randomUUID();
        AdminDeliveryPayoutResponseDto dto = new AdminDeliveryPayoutResponseDto(
                payoutId, UUID.randomUUID(), UUID.randomUUID(), "Vikram Choudhary", "+91 98111 22233",
                BigDecimal.valueOf(1500), PayoutStatus.REQUESTED, PayoutProvider.RAZORPAY,
                "REF-1001", null, Instant.now(), null, ReconciliationStatus.MATCHED, false,
                "Vikram Choudhary", "1234567890", "HDFC0001234", "HDFC Bank"
        );
        PageResult<AdminDeliveryPayoutResponseDto> pageResult = new PageResult<>(
                List.of(dto), new PaginationMeta(0, 20, 1, 1));

        when(adminDeliveryPayoutService.listPayouts(any(), any(), any(), any(), any(), any(), eq(0), eq(20)))
                .thenReturn(pageResult);

        ResponseEntity<ApiResponse<List<AdminDeliveryPayoutResponseDto>>> response = controller.listPayouts(
                null, null, null, null, null, null, 0, 20);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data()).hasSize(1);
        assertThat(response.getBody().data().get(0).partnerName()).isEqualTo("Vikram Choudhary");
    }

    @Test
    void retryPayout_invokesServiceAndReturnsOk() {
        UUID payoutId = UUID.randomUUID();
        AdminDeliveryPayoutResponseDto dto = new AdminDeliveryPayoutResponseDto(
                payoutId, UUID.randomUUID(), UUID.randomUUID(), "Arjun Das", "+91 98222 33344",
                BigDecimal.valueOf(2000), PayoutStatus.PROCESSING, PayoutProvider.RAZORPAY,
                "REF-2002", null, Instant.now(), Instant.now(), ReconciliationStatus.MATCHED, false,
                "Arjun Das", "9876543210", "ICIC0005678", "ICICI Bank"
        );

        when(adminDeliveryPayoutService.retryPayout(payoutId)).thenReturn(dto);

        ResponseEntity<ApiResponse<AdminDeliveryPayoutResponseDto>> response = controller.retryPayout(payoutId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data().status()).isEqualTo(PayoutStatus.PROCESSING);
        verify(adminDeliveryPayoutService).retryPayout(payoutId);
    }
}
