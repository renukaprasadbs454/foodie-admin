package com.foodie.admin.dto.response;

import com.foodie.admin.entity.AdminRoleName;
import java.util.UUID;

import java.util.List;

public record AdminUserResponseDto(
        UUID adminUserId,
        UUID userCredentialId,
        String fullName,
        AdminRoleName role,
        String profileImageKey,
        UUID restaurantId,
        List<String> permissions
) {
    public AdminUserResponseDto(
            UUID adminUserId,
            UUID userCredentialId,
            String fullName,
            AdminRoleName role,
            String profileImageKey
    ) {
        this(adminUserId, userCredentialId, fullName, role, profileImageKey, null, List.of());
    }
}
