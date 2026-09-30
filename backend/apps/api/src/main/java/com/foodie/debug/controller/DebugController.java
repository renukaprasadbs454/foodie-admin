package com.foodie.debug.controller;

import com.foodie.common.dto.ApiResponse;
import com.foodie.restaurant.repository.RestaurantRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/debug")
@Tag(name = "Debug Utilities")
public class DebugController {

    private final RestaurantRepository restaurantRepository;

    public DebugController(RestaurantRepository restaurantRepository) {
        this.restaurantRepository = restaurantRepository;
    }

    @GetMapping("/cleanup-dummy")
    @Transactional
    @Operation(summary = "Cleanup dummy restaurants")
    public ResponseEntity<ApiResponse<String>> cleanupDummy() {
        var list = restaurantRepository.findAll();
        int count = 0;
        for (var r : list) {
            String name = r.getName() != null ? r.getName().toLowerCase() : "";
            if (!name.contains("ganesha") && !name.contains("ganesh") && !name.contains("royal")) {
                r.reject("Cleanup dummy");
                restaurantRepository.save(r);
                count++;
            }
        }
        return ResponseEntity.ok(ApiResponse.success("Cleaned up " + count + " dummy restaurants."));
    }

    @GetMapping("/approve-pending")
    @Transactional
    @Operation(summary = "Approve all pending restaurants")
    public ResponseEntity<ApiResponse<String>> approvePending() {
        int updated = restaurantRepository.approveAllPendingRestaurants();
        return ResponseEntity.ok(ApiResponse.success("Approved " + updated + " pending restaurants."));
    }
}
