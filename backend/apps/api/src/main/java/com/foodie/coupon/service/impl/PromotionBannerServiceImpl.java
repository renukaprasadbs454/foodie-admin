package com.foodie.coupon.service.impl;

import com.foodie.common.exception.ResourceNotFoundException;
import com.foodie.coupon.dto.request.CreatePromotionBannerRequest;
import com.foodie.coupon.dto.request.UpdatePromotionBannerRequest;
import com.foodie.coupon.dto.response.PromotionBannerResponse;
import com.foodie.coupon.entity.PromotionBanner;
import com.foodie.coupon.mapper.PromotionBannerMapper;
import com.foodie.coupon.repository.PromotionBannerRepository;
import com.foodie.coupon.service.PromotionBannerService;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromotionBannerServiceImpl implements PromotionBannerService {

    private final PromotionBannerRepository bannerRepository;
    private final PromotionBannerMapper bannerMapper;

    public PromotionBannerServiceImpl(PromotionBannerRepository bannerRepository, PromotionBannerMapper bannerMapper) {
        this.bannerRepository = bannerRepository;
        this.bannerMapper = bannerMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromotionBannerResponse> getActiveBanners() {
        return bannerRepository.findActiveAndValidBanners(java.time.Instant.now())
                .stream()
                .map(bannerMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromotionBannerResponse> getAllBanners() {
        return bannerRepository.findAllOrdered()
                .stream()
                .map(bannerMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionBannerResponse getBanner(UUID id) {
        PromotionBanner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        return bannerMapper.toResponse(banner);
    }

    @Override
    @Transactional
    public PromotionBannerResponse createBanner(CreatePromotionBannerRequest request) {
        PromotionBanner banner = PromotionBanner.create(
                request.title(),
                request.subtitle(),
                request.imageUrl(),
                request.ctaText(),
                parseCtaType(request.ctaType()),
                request.ctaTarget(),
                parseStatus(request.status()),
                request.displayOrder() != null ? request.displayOrder() : 0,
                request.startsAt(),
                request.endsAt(),
                request.couponId(),
                request.campaignId());
        banner = bannerRepository.save(banner);
        return bannerMapper.toResponse(banner);
    }

    @Override
    @Transactional
    public PromotionBannerResponse updateBanner(UUID id, UpdatePromotionBannerRequest request) {
        PromotionBanner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));

        banner.update(
                request.title(),
                request.subtitle(),
                request.imageUrl(),
                request.ctaText(),
                parseCtaType(request.ctaType()),
                request.ctaTarget(),
                parseStatus(request.status()),
                request.displayOrder() != null ? request.displayOrder() : 0,
                request.startsAt(),
                request.endsAt(),
                request.couponId(),
                request.campaignId());
        banner = bannerRepository.save(banner);
        return bannerMapper.toResponse(banner);
    }

    @Override
    @Transactional
    public void deleteBanner(UUID id) {
        PromotionBanner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        banner.softDelete();
        bannerRepository.save(banner);
    }

    @Override
    @Transactional
    public PromotionBannerResponse activateBanner(UUID id) {
        PromotionBanner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        banner.setStatus(PromotionBanner.Status.ACTIVE);
        bannerRepository.save(banner);
        return bannerMapper.toResponse(banner);
    }

    @Override
    @Transactional
    public PromotionBannerResponse deactivateBanner(UUID id) {
        PromotionBanner banner = bannerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Banner not found"));
        banner.setStatus(PromotionBanner.Status.DEACTIVATED);
        bannerRepository.save(banner);
        return bannerMapper.toResponse(banner);
    }

    private PromotionBanner.CtaType parseCtaType(String typeStr) {
        if (typeStr == null || typeStr.isBlank())
            return null;
        try {
            return PromotionBanner.CtaType.valueOf(typeStr);
        } catch (Exception e) {
            return null;
        }
    }

    private PromotionBanner.Status parseStatus(String statusStr) {
        if (statusStr == null || statusStr.isBlank())
            return PromotionBanner.Status.ACTIVE;
        try {
            return PromotionBanner.Status.valueOf(statusStr);
        } catch (Exception e) {
            return PromotionBanner.Status.ACTIVE;
        }
    }
}
