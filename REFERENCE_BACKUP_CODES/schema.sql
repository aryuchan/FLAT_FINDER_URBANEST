-- FlatFinder — MySQL Schema (utf8mb4, Railway-compatible)

CREATE DATABASE IF NOT EXISTS flatfinder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flatfinder;

CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('tenant','owner','admin') NOT NULL DEFAULT 'tenant',
  status      ENUM('active','suspended')    NOT NULL DEFAULT 'active',
  phone       VARCHAR(20)   NULL DEFAULT NULL,
  whatsapp    VARCHAR(20)   NULL DEFAULT NULL,
  telegram    VARCHAR(80)   NULL DEFAULT NULL,
  location    VARCHAR(120)  NULL DEFAULT NULL,
  languages   VARCHAR(200)  NULL DEFAULT NULL,
  bio         TEXT          NULL DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS flats (
  id          CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  owner_id    CHAR(36)      NOT NULL,
  title       VARCHAR(200)  NOT NULL,
  city        VARCHAR(100)  NOT NULL,
  address     VARCHAR(300)  NULL DEFAULT NULL,
  rent        DECIMAL(10,2) NOT NULL,
  type        ENUM('1BHK','2BHK','3BHK','Studio','4BHK+') NOT NULL,
  furnished   TINYINT(1)    NOT NULL DEFAULT 0,
  available   TINYINT(1)    NOT NULL DEFAULT 1,
  available_from DATE       NULL DEFAULT NULL,
  deposit     DECIMAL(10,2) NULL DEFAULT NULL,
  floor       SMALLINT      NULL DEFAULT NULL,
  total_floors SMALLINT     NULL DEFAULT NULL,
  area_sqft   SMALLINT      NULL DEFAULT NULL,
  bathrooms   VARCHAR(5)    NULL DEFAULT NULL,
  parking     ENUM('none','bike','car','both') NOT NULL DEFAULT 'none',
  facing      VARCHAR(20)   NULL DEFAULT NULL,
  preferred_tenants ENUM('any','family','bachelors','working_women','students') NOT NULL DEFAULT 'any',
  food_preference   ENUM('any','veg','nonveg') NOT NULL DEFAULT 'any',
  pets_allowed      TINYINT(1) NOT NULL DEFAULT 0,
  smoking_allowed   TINYINT(1) NOT NULL DEFAULT 0,
  visitors_allowed  TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT           NULL DEFAULT NULL,
  amenities   JSON           NULL DEFAULT NULL,
  landmarks   VARCHAR(400)   NULL DEFAULT NULL,
  images           JSON      NULL DEFAULT NULL,
  image_public_ids JSON      NULL DEFAULT NULL,
  contact_phone     VARCHAR(20)  NULL DEFAULT NULL,
  contact_whatsapp  VARCHAR(20)  NULL DEFAULT NULL,
  contact_email     VARCHAR(255) NULL DEFAULT NULL,
  contact_telegram  VARCHAR(80)  NULL DEFAULT NULL,
  preferred_contact ENUM('','phone','whatsapp','telegram','email') NOT NULL DEFAULT '',
  best_time_to_call VARCHAR(40)  NULL DEFAULT NULL,
  owner_note        TEXT         NULL DEFAULT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_flat_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS listings (
  id               CHAR(36)  NOT NULL PRIMARY KEY DEFAULT (UUID()),
  flat_id          CHAR(36)  NOT NULL UNIQUE,
  owner_id         CHAR(36)  NOT NULL,
  status           ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT      NULL DEFAULT NULL,
  submitted_at     DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at      DATETIME  NULL DEFAULT NULL,
  reviewed_by      CHAR(36)  NULL DEFAULT NULL,
  CONSTRAINT fk_listing_flat     FOREIGN KEY (flat_id)     REFERENCES flats(id)  ON DELETE CASCADE,
  CONSTRAINT fk_listing_owner    FOREIGN KEY (owner_id)    REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_listing_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)  ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id          CHAR(36)       NOT NULL PRIMARY KEY DEFAULT (UUID()),
  flat_id     CHAR(36)       NOT NULL,
  tenant_id   CHAR(36)       NOT NULL,
  owner_id    CHAR(36)       NOT NULL,
  check_in    DATE           NOT NULL,
  check_out   DATE           NOT NULL,
  total_rent  DECIMAL(12,2)  NOT NULL,
  status      ENUM('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
  created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_flat   FOREIGN KEY (flat_id)   REFERENCES flats(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_owner  FOREIGN KEY (owner_id)  REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes — drop-before-create makes this script safely re-runnable
DROP INDEX IF EXISTS idx_flats_owner     ON flats;
DROP INDEX IF EXISTS idx_flats_city      ON flats;
DROP INDEX IF EXISTS idx_flats_available ON flats;
DROP INDEX IF EXISTS idx_flats_type      ON flats;
DROP INDEX IF EXISTS idx_flats_rent      ON flats;
DROP INDEX IF EXISTS idx_bookings_tenant ON bookings;
DROP INDEX IF EXISTS idx_bookings_flat   ON bookings;
DROP INDEX IF EXISTS idx_listings_status ON listings;
DROP INDEX IF EXISTS idx_listings_owner  ON listings;

CREATE INDEX idx_flats_owner     ON flats(owner_id);
CREATE INDEX idx_flats_city      ON flats(city);
CREATE INDEX idx_flats_available ON flats(available);
CREATE INDEX idx_flats_type      ON flats(type);
CREATE INDEX idx_flats_rent      ON flats(rent);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id);
CREATE INDEX idx_bookings_flat   ON bookings(flat_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_owner  ON listings(owner_id);