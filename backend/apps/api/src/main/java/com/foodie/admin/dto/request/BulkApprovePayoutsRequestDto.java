package com.foodie.admin.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BulkApprovePayoutsRequestDto(@NotEmpty List<UUID> payoutIds) {}
