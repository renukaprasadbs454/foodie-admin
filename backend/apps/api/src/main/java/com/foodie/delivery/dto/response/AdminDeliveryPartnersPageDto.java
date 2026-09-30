package com.foodie.delivery.dto.response;

import java.util.List;

public record AdminDeliveryPartnersPageDto(
        List<AdminDeliveryPartnerResponseDto> items,
        PaginationDto pagination
) {
    public record PaginationDto(
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {}
}
