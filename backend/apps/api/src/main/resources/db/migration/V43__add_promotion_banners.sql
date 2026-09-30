CREATE TABLE promotion_banner (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url VARCHAR(1024) NOT NULL,
    cta_text VARCHAR(100),
    cta_type VARCHAR(50),
    cta_target VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    coupon_id UUID REFERENCES coupon(id),
    campaign_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_promotion_banner_status ON promotion_banner (status);
CREATE INDEX idx_promotion_banner_display_order ON promotion_banner (display_order);
CREATE INDEX idx_promotion_banner_starts_at ON promotion_banner (starts_at);
CREATE INDEX idx_promotion_banner_ends_at ON promotion_banner (ends_at);
