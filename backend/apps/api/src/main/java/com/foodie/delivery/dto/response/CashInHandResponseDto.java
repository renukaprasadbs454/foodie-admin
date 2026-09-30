package com.foodie.delivery.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record CashInHandResponseDto(
        BigDecimal cashInHand,
        BigDecimal maxCashInHandLimit,
        boolean limitExceeded,
        List<CashDepositResponseDto> deposits
) {}
