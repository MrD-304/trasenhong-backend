-- ================================================================
-- Trà Sen Hồng – Database Schema
-- MySQL 8.0+
-- ================================================================

CREATE DATABASE IF NOT EXISTS trasenhong
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE trasenhong;

-- ── USERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name    VARCHAR(100) NOT NULL,
  email        VARCHAR(150) NOT NULL UNIQUE,
  phone        VARCHAR(20),
  password     VARCHAR(255) NOT NULL,
  role         ENUM('customer','admin') NOT NULL DEFAULT 'customer',
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── CATEGORIES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (name, slug, description) VALUES
  ('Trà Lá (Loose-leaf)', 'tra-la',      'Trà lá rời nguyên chất'),
  ('Trà Túi Lọc',         'tra-tui-loc', 'Trà đóng gói túi lọc tiện lợi'),
  ('Bộ Quà Tặng',         'giftset',     'Hộp quà trà mộc cao cấp'),
  ('Phụ Kiện Trà',        'phu-kien',    'Ấm chén và dụng cụ pha trà');

-- ── PRODUCTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(200) NOT NULL,
  slug            VARCHAR(220) NOT NULL UNIQUE,
  description     TEXT,
  price           INT UNSIGNED NOT NULL DEFAULT 0,
  original_price  INT UNSIGNED DEFAULT NULL,
  stock           INT UNSIGNED NOT NULL DEFAULT 0,
  weight          INT UNSIGNED DEFAULT 300   COMMENT 'gram – dùng tính phí GHN',
  images          JSON DEFAULT NULL           COMMENT '["url1","url2"]',
  tags            JSON DEFAULT NULL           COMMENT '["ban-chay","moi"]',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ── ORDERS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_code            VARCHAR(30)  NOT NULL UNIQUE,
  user_id               INT UNSIGNED DEFAULT NULL,
  full_name             VARCHAR(100) NOT NULL,
  phone                 VARCHAR(20)  NOT NULL,
  email                 VARCHAR(150) DEFAULT NULL,
  address               VARCHAR(300) NOT NULL,
  ward                  VARCHAR(100) DEFAULT NULL,
  district              VARCHAR(100) DEFAULT NULL,
  province              VARCHAR(100) NOT NULL,
  ward_code             VARCHAR(20)  DEFAULT NULL,
  district_id           INT UNSIGNED DEFAULT NULL,
  note                  TEXT         DEFAULT NULL,
  payment_method        ENUM('cod','transfer','momo') NOT NULL DEFAULT 'cod',
  payment_status        ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  status                ENUM('pending','confirmed','processing','shipping','delivered','cancelled') NOT NULL DEFAULT 'pending',
  subtotal              INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_fee          INT UNSIGNED NOT NULL DEFAULT 0,
  discount              INT UNSIGNED NOT NULL DEFAULT 0,
  total                 INT UNSIGNED NOT NULL DEFAULT 0,
  ghn_order_code        VARCHAR(50)  DEFAULT NULL,
  ghn_expected_delivery DATETIME     DEFAULT NULL,
  promo_code            VARCHAR(30)  DEFAULT NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── ORDER ITEMS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id    INT UNSIGNED NOT NULL,
  product_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(200) NOT NULL,
  price       INT UNSIGNED NOT NULL,
  quantity    INT UNSIGNED NOT NULL DEFAULT 1,
  subtotal    INT UNSIGNED NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ── PROMO CODES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promo_codes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30)  NOT NULL UNIQUE,
  discount_type   ENUM('percent','fixed') NOT NULL DEFAULT 'percent',
  discount_value  INT UNSIGNED NOT NULL,
  min_order       INT UNSIGNED NOT NULL DEFAULT 0,
  max_uses        INT UNSIGNED DEFAULT NULL,
  used_count      INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at      DATETIME DEFAULT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO promo_codes (code, discount_type, discount_value, min_order) VALUES
  ('TRASENHONG10', 'percent', 10, 100000),
  ('WELCOME20',    'percent', 20, 200000),
  ('TSH15',        'percent', 15, 150000);

-- ── REVIEWS ──────────────────────────────────────────────────────
-- Bảng này bị thiếu trong schema gốc, Review.js cần nó
CREATE TABLE IF NOT EXISTS reviews (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  location   VARCHAR(100) NOT NULL DEFAULT '',
  rating     TINYINT UNSIGNED NOT NULL DEFAULT 5,
  content    TEXT NOT NULL,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── INDEXES ───────────────────────────────────────────────────────
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_active    ON products(is_active);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_code        ON orders(order_code);
CREATE INDEX idx_orders_ghn         ON orders(ghn_order_code);
CREATE INDEX idx_order_items_order  ON order_items(order_id);
CREATE INDEX idx_reviews_active     ON reviews(is_active);
