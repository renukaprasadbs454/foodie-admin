package com.foodie.coupon.repository;

import com.foodie.coupon.entity.PromotionBanner;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PromotionBannerRepository extends JpaRepository<PromotionBanner, UUID> {

    @Query("SELECT b FROM PromotionBanner b WHERE b.status = 'ACTIVE' AND (b.startsAt IS NULL OR b.startsAt <= :now) AND (b.endsAt IS NULL OR b.endsAt >= :now) ORDER BY b.displayOrder ASC")
    List<PromotionBanner> findActiveAndValidBanners(
            @org.springframework.data.repository.query.Param("now") java.time.Instant now);

    @Query("SELECT b FROM PromotionBanner b ORDER BY b.displayOrder ASC, b.createdAt DESC")
    List<PromotionBanner> findAllOrdered();
}
