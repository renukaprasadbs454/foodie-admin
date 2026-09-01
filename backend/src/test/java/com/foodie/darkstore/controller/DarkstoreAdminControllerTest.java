package com.foodie.darkstore.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.foodie.common.dto.ApiResponse;
import com.foodie.darkstore.dto.DarkstoreMetricsDto;
import com.foodie.darkstore.dto.DarkstoreOrderDto;
import com.foodie.darkstore.dto.DarkstoreProductDto;
import com.foodie.darkstore.dto.DarkstoreProfileDto;
import com.foodie.darkstore.dto.DarkstoreStaffDto;
import com.foodie.darkstore.service.DarkstoreAdminService;
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
class DarkstoreAdminControllerTest {

    @Mock
    private DarkstoreAdminService darkstoreAdminService;

    private DarkstoreAdminController controller;

    @BeforeEach
    void setUp() {
        controller = new DarkstoreAdminController(darkstoreAdminService);
    }

    @Test
    void getDashboardMetrics_returnsMetrics() {
        UUID dsId = UUID.randomUUID();
        DarkstoreMetricsDto metrics = new DarkstoreMetricsDto(
                10, 2, 3, 2, 3, 0, 1, 1, 20, BigDecimal.valueOf(500), BigDecimal.valueOf(50), 6
        );

        when(darkstoreAdminService.getDashboardMetrics(dsId)).thenReturn(metrics);

        ResponseEntity<ApiResponse<DarkstoreMetricsDto>> response = controller.getDashboardMetrics(dsId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data().totalOrders()).isEqualTo(10);
        verify(darkstoreAdminService).getDashboardMetrics(dsId);
    }

    @Test
    void updateOrderStatus_returnsUpdatedOrder() {
        UUID orderId = UUID.randomUUID();
        DarkstoreOrderDto orderDto = new DarkstoreOrderDto(
                orderId, "FD-10234", UUID.randomUUID(), "Aarav Mehta", "+91 98999 12345",
                "Indiranagar", BigDecimal.valueOf(150), "PACKING", "HIGH",
                "Karan Verma", "Pooja Nair", "Vikram", "+91 98111 22233", "WAITING_FOR_PARTNER",
                null, Instant.now(), Instant.now(), List.of()
        );

        when(darkstoreAdminService.updateOrderStatus(orderId, "PACKING", null)).thenReturn(orderDto);

        ResponseEntity<ApiResponse<DarkstoreOrderDto>> response = controller.updateOrderStatus(orderId, "PACKING", null);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().data().status()).isEqualTo("PACKING");
    }
}
