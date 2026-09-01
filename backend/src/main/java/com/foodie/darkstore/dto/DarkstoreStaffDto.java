package com.foodie.darkstore.dto;

import java.time.Instant;
import java.util.UUID;

public record DarkstoreStaffDto(
        UUID id,
        UUID darkstoreId,
        String name,
        String phone,
        String email,
        String role,
        String status,
        int activeTasksCount,
        String loginStatus,
        Instant createdAt
) {
}
