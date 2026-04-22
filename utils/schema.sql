-- Urbanest Production Master Schema (v18.0)
-- Objective: Zero-intervention, idempotent, high-performance database foundation.

SET FOREIGN_KEY_CHECKS = 0;
-- Non-destructive migration: tables are only created if they don't exist.
-- To force a reset, manually drop tables in your DB dashboard.
SET FOREIGN_KEY_CHECKS = 1;

-- 1. USERS Table
-- Using CHAR(36) for UUIDs to ensure fixed-length performance optimization.
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('tenant','owner','admin') NOT NULL DEFAULT 'tenant',
  status ENUM('active','suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  telegram VARCHAR(50),
  bio TEXT,
  INDEX idx_user_email (email),
  INDEX idx_user_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. FLATS Table
CREATE TABLE IF NOT EXISTS flats (
  id CHAR(36) PRIMARY KEY,
  owner_id CHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  address TEXT,
  description TEXT,
  rent DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) DEFAULT 0,
  type VARCHAR(50) NOT NULL,
  floor INT DEFAULT 0,
  total_floors INT DEFAULT 0,
  area_sqft INT DEFAULT 0,
  parking ENUM('none', 'bike', 'car', 'both') DEFAULT 'none',
  preferred_tenants ENUM('any', 'family', 'bachelors') DEFAULT 'any',
  food_preference ENUM('any', 'veg', 'nonveg') DEFAULT 'any',
  images LONGTEXT,
  amenities LONGTEXT,
  available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_flat_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_flat_city (city),
  INDEX idx_flat_available (available),
  INDEX idx_flat_owner (owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BOOKINGS Table
CREATE TABLE IF NOT EXISTS bookings (
  id CHAR(36) PRIMARY KEY,
  flat_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_rent DECIMAL(12,2) DEFAULT 0,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_flat FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_booking_tenant (tenant_id),
  INDEX idx_booking_flat (flat_id),
  INDEX idx_booking_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. LISTINGS Table (Approvals)
CREATE TABLE IF NOT EXISTS listings (
  id CHAR(36) PRIMARY KEY,
  flat_id CHAR(36) NOT NULL UNIQUE,
  owner_id CHAR(36) NOT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  reviewed_by CHAR(36) NULL,
  CONSTRAINT fk_listing_flat FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
  CONSTRAINT fk_listing_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_listing_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
