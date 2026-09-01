-- Module 24: Quick-Commerce Darkstore Operations (Instamart / Blinkit-style Darkstore Management)
-- Darkstore entity, staff, catalog products, inventory logs, quick-commerce orders & items

CREATE TABLE darkstore (
    id                  UUID PRIMARY KEY,
    code                VARCHAR(50) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    address             VARCHAR(255) NOT NULL,
    phone               VARCHAR(30) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    delivery_radius_km  DECIMAL(4,2) NOT NULL DEFAULT 3.50,
    serviceable_areas   VARCHAR(255),
    open_time           VARCHAR(20) DEFAULT '06:00 AM',
    close_time          VARCHAR(20) DEFAULT '11:00 PM',
    staff_count         INT NOT NULL DEFAULT 8,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE darkstore_staff (
    id                  UUID PRIMARY KEY,
    darkstore_id        UUID NOT NULL REFERENCES darkstore(id),
    name                VARCHAR(100) NOT NULL,
    phone               VARCHAR(30) NOT NULL,
    email               VARCHAR(100) NOT NULL,
    role                VARCHAR(30) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    active_tasks_count  INT NOT NULL DEFAULT 0,
    login_status        VARCHAR(20) NOT NULL DEFAULT 'ONLINE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE darkstore_product (
    id                  UUID PRIMARY KEY,
    darkstore_id        UUID NOT NULL REFERENCES darkstore(id),
    sku                 VARCHAR(50) NOT NULL,
    name                VARCHAR(150) NOT NULL,
    category            VARCHAR(50) NOT NULL,
    image_url           VARCHAR(255),
    price               DECIMAL(10,2) NOT NULL,
    selling_price       DECIMAL(10,2) NOT NULL,
    current_stock       INT NOT NULL DEFAULT 0,
    reserved_stock      INT NOT NULL DEFAULT 0,
    min_threshold       INT NOT NULL DEFAULT 10,
    unit                VARCHAR(20) DEFAULT 'pcs',
    tax_percent         DECIMAL(5,2) DEFAULT 5.00,
    shelf_location      VARCHAR(50) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_darkstore_product_sku UNIQUE (darkstore_id, sku)
);

CREATE TABLE darkstore_inventory_tx (
    id                  UUID PRIMARY KEY,
    darkstore_product_id UUID NOT NULL REFERENCES darkstore_product(id),
    tx_type             VARCHAR(30) NOT NULL,
    quantity            INT NOT NULL,
    reason              VARCHAR(255),
    created_by          VARCHAR(100) DEFAULT 'Darkstore Staff',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE darkstore_order (
    id                      UUID PRIMARY KEY,
    order_number            VARCHAR(50) NOT NULL UNIQUE,
    darkstore_id            UUID NOT NULL REFERENCES darkstore(id),
    customer_name           VARCHAR(100) NOT NULL,
    customer_phone          VARCHAR(30) NOT NULL,
    delivery_address        VARCHAR(255) NOT NULL,
    total_amount            DECIMAL(10,2) NOT NULL,
    status                  VARCHAR(30) NOT NULL DEFAULT 'NEW',
    priority                VARCHAR(20) DEFAULT 'NORMAL',
    assigned_picker         VARCHAR(100),
    assigned_packer         VARCHAR(100),
    delivery_partner_name   VARCHAR(100),
    delivery_partner_phone  VARCHAR(30),
    pickup_status           VARCHAR(30) DEFAULT 'WAITING_FOR_PARTNER',
    cancellation_reason     VARCHAR(255),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE darkstore_order_item (
    id                  UUID PRIMARY KEY,
    darkstore_order_id  UUID NOT NULL REFERENCES darkstore_order(id),
    product_id          UUID NOT NULL REFERENCES darkstore_product(id),
    sku                 VARCHAR(50) NOT NULL,
    product_name        VARCHAR(150) NOT NULL,
    image_url           VARCHAR(255),
    shelf_location      VARCHAR(50) NOT NULL,
    quantity_requested  INT NOT NULL,
    quantity_picked     INT NOT NULL DEFAULT 0,
    unit_price          DECIMAL(10,2) NOT NULL,
    status              VARCHAR(20) DEFAULT 'PENDING'
);

CREATE INDEX idx_darkstore_prod_ds ON darkstore_product(darkstore_id);
CREATE INDEX idx_darkstore_order_ds ON darkstore_order(darkstore_id);
CREATE INDEX idx_darkstore_order_status ON darkstore_order(status);

-- Seed Initial Darkstore
INSERT INTO darkstore (id, code, name, address, phone, status, delivery_radius_km, serviceable_areas, open_time, close_time, staff_count, created_at, updated_at)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'DS-IND-101',
    'Foodie Instamart Darkstore - Indiranagar',
    '100 Feet Rd, Indiranagar, Bengaluru, KA 560038',
    '+91 98000 11223',
    'OPEN',
    3.50,
    'Indiranagar, Domlur, HAL 2nd Stage, Cambridge Layout',
    '06:00 AM',
    '11:00 PM',
    12,
    now(),
    now()
);

-- Seed Initial Products
INSERT INTO darkstore_product (id, darkstore_id, sku, name, category, image_url, price, selling_price, current_stock, reserved_stock, min_threshold, unit, tax_percent, shelf_location, status, created_at, updated_at)
VALUES 
(
    'dp111111-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'MILK-AMUL-500ML',
    'Amul Taaza Toned Fresh Milk 500ml',
    'Dairy & Eggs',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
    30.00,
    28.00,
    85,
    5,
    15,
    'pack',
    5.00,
    'Shelf A-01 (Cooler)',
    'ACTIVE',
    now(),
    now()
),
(
    'dp222222-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'BREAD-BRIT-400G',
    'Britannia Brown Bread Whole Wheat 400g',
    'Bakery & Bread',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
    50.00,
    45.00,
    6,
    2,
    10,
    'pack',
    5.00,
    'Shelf A-12',
    'ACTIVE',
    now(),
    now()
),
(
    'dp333333-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000003',
    'CHIPS-LAYS-MAGIC-50G',
    'Lays India Magic Masala Chips 50g',
    'Snacks & Munchies',
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300',
    20.00,
    20.00,
    0,
    0,
    12,
    'pcs',
    12.00,
    'Shelf B-04',
    'ACTIVE',
    now(),
    now()
),
(
    'dp444444-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'COKE-ZERO-330ML',
    'Coca-Cola Zero Sugar Can 330ml',
    'Beverages',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300',
    40.00,
    38.00,
    42,
    3,
    8,
    'pcs',
    12.00,
    'Shelf C-08 (Chiller)',
    'ACTIVE',
    now(),
    now()
),
(
    'dp555555-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'YOGURT-EPIG-85G',
    'Epigamia Greek Yogurt Natural 85g',
    'Dairy & Eggs',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300',
    60.00,
    55.00,
    30,
    2,
    5,
    'pack',
    5.00,
    'Shelf A-05 (Cooler)',
    'ACTIVE',
    now(),
    now()
),
(
    'dp666666-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'CHOC-FERRERO-16P',
    'Ferrero Rocher Premium Chocolate Box 16 Pcs',
    'Chocolates & Sweets',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300',
    550.00,
    499.00,
    18,
    1,
    4,
    'box',
    12.00,
    'Shelf D-02 (Premium)',
    'ACTIVE',
    now(),
    now()
),
(
    'dp777777-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000001',
    'OIL-FORTUNE-1L',
    'Fortune Sunlite Refined Sunflower Oil 1L',
    'Oil & Ghee',
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
    160.00,
    145.00,
    50,
    4,
    10,
    'pouch',
    5.00,
    'Shelf E-10 (Pantry)',
    'ACTIVE',
    now(),
    now()
);

-- Seed Staff
INSERT INTO darkstore_staff (id, darkstore_id, name, phone, email, role, status, active_tasks_count, login_status, created_at)
VALUES 
('ds111111-1111-1111-1111-111111111111', 'd0000000-0000-0000-0000-000000000001', 'Rajesh Sharma', '+91 98111 00112', 'rajesh.darkstore@foodie.local', 'DARKSTORE_MANAGER', 'ACTIVE', 0, 'ONLINE', now()),
('ds222222-2222-2222-2222-222222222222', 'd0000000-0000-0000-0000-000000000001', 'Karan Verma', '+91 98222 00223', 'karan.picker@foodie.local', 'PICKER', 'ACTIVE', 2, 'ONLINE', now()),
('ds333333-3333-3333-3333-333333333333', 'd0000000-0000-0000-0000-000000000001', 'Pooja Nair', '+91 98333 00334', 'pooja.packer@foodie.local', 'PACKER', 'ACTIVE', 1, 'ONLINE', now());

-- Seed Sample Quick-Commerce Orders
INSERT INTO darkstore_order (id, order_number, darkstore_id, customer_name, customer_phone, delivery_address, total_amount, status, priority, assigned_picker, assigned_packer, delivery_partner_name, delivery_partner_phone, pickup_status, created_at, updated_at)
VALUES 
(
    'do111111-1111-1111-1111-111111111111',
    'FD-10234',
    'd0000000-0000-0000-0000-000000000001',
    'Aarav Mehta',
    '+91 98999 12345',
    'Flat 402, Green Acres, 12th Main Indiranagar',
    991.00,
    'PICKING',
    'HIGH',
    'Karan Verma',
    'Pooja Nair',
    'Vikram Choudhary',
    '+91 98111 22233',
    'WAITING_FOR_PARTNER',
    now(),
    now()
),
(
    'do222222-2222-2222-2222-222222222222',
    'FD-10235',
    'd0000000-0000-0000-0000-000000000001',
    'Sneha Kapoor',
    '+91 98888 67890',
    'Villa 14, Palm Grove, Domlur',
    66.00,
    'NEW',
    'NORMAL',
    NULL,
    NULL,
    NULL,
    NULL,
    'WAITING_FOR_PARTNER',
    now(),
    now()
);

-- Seed Sample Order Items for FD-10234
INSERT INTO darkstore_order_item (id, darkstore_order_id, product_id, sku, product_name, image_url, shelf_location, quantity_requested, quantity_picked, unit_price, status)
VALUES 
(
    'doi11111-1111-1111-1111-111111111111',
    'do111111-1111-1111-1111-111111111111',
    'dp111111-0000-0000-0000-000000000001',
    'MILK-AMUL-500ML',
    'Amul Taaza Toned Fresh Milk 500ml',
    'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300',
    'Shelf A-01 (Cooler)',
    2,
    2,
    28.00,
    'PICKED'
),
(
    'doi22222-2222-2222-2222-222222222222',
    'do111111-1111-1111-1111-111111111111',
    'dp222222-0000-0000-0000-000000000002',
    'BREAD-BRIT-400G',
    'Britannia Brown Bread Whole Wheat 400g',
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300',
    'Shelf A-12',
    1,
    0,
    45.00,
    'PENDING'
),
(
    'doi33333-3333-3333-3333-333333333333',
    'do111111-1111-1111-1111-111111111111',
    'dp444444-0000-0000-0000-000000000004',
    'COKE-ZERO-330ML',
    'Coca-Cola Zero Sugar Can 330ml',
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300',
    'Shelf C-08 (Chiller)',
    2,
    1,
    38.00,
    'PENDING'
),
(
    'doi44444-4444-4444-4444-444444444444',
    'do111111-1111-1111-1111-111111111111',
    'dp333333-0000-0000-0000-000000000003',
    'CHIPS-LAYS-MAGIC-50G',
    "Lay's India's Magic Masala Chips 50g",
    'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300',
    'Shelf B-04 (Snacks)',
    3,
    0,
    20.00,
    'PENDING'
),
(
    'doi55555-5555-5555-5555-555555555555',
    'do111111-1111-1111-1111-111111111111',
    'dp555555-0000-0000-0000-000000000005',
    'YOGURT-EPIG-85G',
    'Epigamia Greek Yogurt Natural 85g',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=300',
    'Shelf A-05 (Cooler)',
    2,
    0,
    55.00,
    'PENDING'
),
(
    'doi66666-6666-6666-6666-666666666666',
    'do111111-1111-1111-1111-111111111111',
    'dp666666-0000-0000-0000-000000000006',
    'CHOC-FERRERO-16P',
    'Ferrero Rocher Premium Chocolate Box 16 Pcs',
    'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300',
    'Shelf D-02 (Premium)',
    1,
    0,
    499.00,
    'PENDING'
),
(
    'doi77777-7777-7777-7777-777777777777',
    'do111111-1111-1111-1111-111111111111',
    'dp777777-0000-0000-0000-000000000007',
    'OIL-FORTUNE-1L',
    'Fortune Sunlite Refined Sunflower Oil 1L',
    'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300',
    'Shelf E-10 (Pantry)',
    1,
    0,
    145.00,
    'PENDING'
);
