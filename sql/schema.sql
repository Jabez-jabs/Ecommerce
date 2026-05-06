-- E-Commerce AI System — PostgreSQL Schema
-- Run: psql -U postgres -d ecommerce_db -f sql/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email            VARCHAR(255) UNIQUE NOT NULL,
    hashed_password  VARCHAR(255) NOT NULL,
    full_name        VARCHAR(255) NOT NULL,
    phone            VARCHAR(20),
    role             VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer','admin','seller')),
    is_active        BOOLEAN DEFAULT TRUE,
    -- ML features
    total_orders          INT DEFAULT 0,
    total_spent           NUMERIC(12,2) DEFAULT 0,
    avg_order_value       NUMERIC(10,2) DEFAULT 0,
    days_since_last_order INT,
    churn_risk_score      NUMERIC(4,3) DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE addresses (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    label      VARCHAR(50) DEFAULT 'Home',
    street     VARCHAR(255) NOT NULL,
    city       VARCHAR(100) NOT NULL,
    state      VARCHAR(100) NOT NULL,
    pincode    VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Catalog ───────────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) UNIQUE NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id   UUID REFERENCES categories(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id   UUID NOT NULL REFERENCES categories(id),
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) UNIQUE NOT NULL,
    description   TEXT,
    brand         VARCHAR(100),
    tags          TEXT[],
    image_urls    TEXT[],
    is_active     BOOLEAN DEFAULT TRUE,
    -- Pricing
    base_price    NUMERIC(10,2) NOT NULL,
    current_price NUMERIC(10,2) NOT NULL,
    min_price     NUMERIC(10,2) NOT NULL,
    max_price     NUMERIC(10,2) NOT NULL,
    discount_pct  NUMERIC(5,2) DEFAULT 0,
    -- Demand signals (updated hourly)
    views_last_24h   INT DEFAULT 0,
    add_to_cart_rate NUMERIC(5,3) DEFAULT 0,
    conversion_rate  NUMERIC(5,3) DEFAULT 0,
    avg_rating       NUMERIC(3,1) DEFAULT 0,
    review_count     INT DEFAULT 0,
    -- Search index
    search_vector    JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_brand    ON products(brand);
CREATE INDEX idx_products_price    ON products(current_price);
CREATE INDEX idx_products_rating   ON products(avg_rating DESC);

CREATE TABLE product_variants (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id        UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku               VARCHAR(100) UNIQUE NOT NULL,
    size              VARCHAR(50),
    color             VARCHAR(50),
    material          VARCHAR(100),
    extra_attributes  JSONB DEFAULT '{}',
    stock_available   INT DEFAULT 0 NOT NULL,
    stock_reserved    INT DEFAULT 0,
    restock_threshold INT DEFAULT 10,
    price_modifier    NUMERIC(8,2) DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_sku     ON product_variants(sku);

CREATE TABLE reviews (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating           SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title            VARCHAR(255),
    body             TEXT,
    verified_purchase BOOLEAN DEFAULT FALSE,
    helpful_votes    INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_history (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    old_price   NUMERIC(10,2) NOT NULL,
    new_price   NUMERIC(10,2) NOT NULL,
    reason      VARCHAR(100),
    triggered_by VARCHAR(50) DEFAULT 'system',
    changed_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_price_history_product ON price_history(product_id, changed_at DESC);

-- ── Commerce ──────────────────────────────────────────────────────────────────
CREATE TABLE coupons (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code           VARCHAR(50) UNIQUE NOT NULL,
    description    VARCHAR(255),
    discount_type  VARCHAR(20) DEFAULT 'percent',
    discount_value NUMERIC(8,2) NOT NULL,
    min_order_value NUMERIC(10,2) DEFAULT 0,
    max_uses       INT,
    used_count     INT DEFAULT 0,
    is_active      BOOLEAN DEFAULT TRUE,
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE carts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id      VARCHAR(100),
    coupon_code     VARCHAR(50),
    discount_amount NUMERIC(10,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id    UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity   INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    address_id       UUID REFERENCES addresses(id),
    status           VARCHAR(20) DEFAULT 'pending',
    payment_status   VARCHAR(20) DEFAULT 'pending',
    payment_method   VARCHAR(50),
    subtotal         NUMERIC(12,2) NOT NULL,
    discount_amount  NUMERIC(10,2) DEFAULT 0,
    shipping_charge  NUMERIC(8,2) DEFAULT 0,
    tax_amount       NUMERIC(10,2) DEFAULT 0,
    total            NUMERIC(12,2) NOT NULL,
    coupon_code      VARCHAR(50),
    notes            TEXT,
    shipping_address_snapshot JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_user   ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_items (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id    UUID REFERENCES product_variants(id),
    product_name  VARCHAR(255) NOT NULL,
    sku           VARCHAR(100) NOT NULL,
    variant_label VARCHAR(100),
    unit_price    NUMERIC(10,2) NOT NULL,
    quantity      INT NOT NULL,
    line_total    NUMERIC(12,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ── Intelligence / ML ─────────────────────────────────────────────────────────
CREATE TABLE user_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id  VARCHAR(100),
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id  UUID REFERENCES product_variants(id),
    event_type  VARCHAR(30) NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_events_product_type_time ON user_events(product_id, event_type, created_at);
CREATE INDEX idx_events_user_time         ON user_events(user_id, created_at DESC);

CREATE TABLE product_recommendations (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    recommended_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    score                  NUMERIC(6,4) NOT NULL,
    recommendation_type    VARCHAR(50) DEFAULT 'co_purchase',
    updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rec_source_score ON product_recommendations(source_product_id, score DESC);

CREATE TABLE search_logs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    query             VARCHAR(500) NOT NULL,
    results_count     INT DEFAULT 0,
    clicked_product_id UUID REFERENCES products(id),
    clicked_position  INT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_search_logs_query ON search_logs(query);
