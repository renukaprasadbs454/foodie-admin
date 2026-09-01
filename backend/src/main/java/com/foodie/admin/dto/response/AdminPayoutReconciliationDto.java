package com.foodie.admin.dto.response;

import java.util.List;

public record AdminPayoutReconciliationDto(
        long matchedCount,
        long amountMismatchCount,
        long statusMismatchCount,
        long missingProviderRecordCount,
        long duplicateCount,
        List<AdminDeliveryPayoutResponseDto> discrepancies
) {
}
