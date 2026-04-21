-- ─────────────────────────────────────────────────────────────────────────────
-- FlatFinder — MySQL Schema  (utf8mb4, Railway-compatible)
-- Version 3 — Cloudinary-integrated (images + image_public_ids columns)
--
-- HOW TO APPLY:
--   Option A (fresh install):  run this entire file once.
--   Option B (existing DB):    run ONLY the ALTER TABLE blocks at the bottom (safe, idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS flatfinder
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE flatfinder;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(120)  NOT NULL,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('tenant','owner','admin') NOT NULL DEFAULT 'tenant',
  status      ENUM('active','suspended')    NOT NULL DEFAULT 'active',

  -- Contact / profile fields (owner-facing, shown to tenants)
  phone       VARCHAR(20)   NULL DEFAULT NULL,
  whatsapp    VARCHAR(20)   NULL DEFAULT NULL,
  telegram    VARCHAR(80)   NULL DEFAULT NULL,   -- stored without @
  location    VARCHAR(120)  NULL DEFAULT NULL,   -- e.g. "Pune, Maharashtra"
  languages   VARCHAR(200)  NULL DEFAULT NULL,   -- e.g. "English, Hindi, Marathi"
  bio         TEXT          NULL DEFAULT NULL,   -- shown to tenants on listing

  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FLATS
--    images            → JSON array of Cloudinary secure_url strings
--    image_public_ids  → JSON array of Cloudinary public_id strings
--                        (needed by server.js to delete images from Cloudinary
--                         when a flat is deleted via DELETE /api/flats/:id)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flats (
  id          CHAR(36)      NOT NULL PRIMARY KEY DEFAULT (UUID()),
  owner_id    CHAR(36)      NOT NULL,

  -- Basic Details
  title       VARCHAR(200)  NOT NULL,
  city        VARCHAR(100)  NOT NULL,
  address     VARCHAR(300)  NULL DEFAULT NULL,
  rent        DECIMAL(10,2) NOT NULL,
  type        ENUM('1BHK','2BHK','3BHK','Studio','4BHK+') NOT NULL,
  furnished   TINYINT(1)    NOT NULL DEFAULT 0,
  available   TINYINT(1)    NOT NULL DEFAULT 1,
  available_from DATE       NULL DEFAULT NULL,
  deposit     DECIMAL(10,2) NULL DEFAULT NULL,

  -- Property Details
  floor       SMALLINT      NULL DEFAULT NULL,
  total_floors SMALLINT     NULL DEFAULT NULL,
  area_sqft   SMALLINT      NULL DEFAULT NULL,
  bathrooms   VARCHAR(5)    NULL DEFAULT NULL,   -- "1","2","3","4+" — VARCHAR for "4+"
  parking     ENUM('none','bike','car','both') NOT NULL DEFAULT 'none',
  facing      VARCHAR(20)   NULL DEFAULT NULL,

  -- Preferences / Rules
  preferred_tenants ENUM('any','family','bachelors','working_women','students')
                              NOT NULL DEFAULT 'any',
  food_preference   ENUM('any','veg','nonveg') NOT NULL DEFAULT 'any',
  pets_allowed      TINYINT(1) NOT NULL DEFAULT 0,
  smoking_allowed   TINYINT(1) NOT NULL DEFAULT 0,
  visitors_allowed  TINYINT(1) NOT NULL DEFAULT 0,

  -- Description & Amenities
  description TEXT           NULL DEFAULT NULL,
  amenities   JSON           NULL DEFAULT NULL,  -- ["WiFi","AC","Lift"]
  landmarks   VARCHAR(400)   NULL DEFAULT NULL,

  -- Media — Cloudinary
  images           JSON      NULL DEFAULT NULL,  -- ["https://res.cloudinary.com/…","…"]
  image_public_ids JSON      NULL DEFAULT NULL,  -- ["flatfinder/abc123","flatfinder/def456"]

  -- Owner contact shown on listing
  contact_phone     VARCHAR(20)  NULL DEFAULT NULL,
  contact_whatsapp  VARCHAR(20)  NULL DEFAULT NULL,
  contact_email     VARCHAR(255) NULL DEFAULT NULL,
  contact_telegram  VARCHAR(80)  NULL DEFAULT NULL,
  preferred_contact ENUM('','phone','whatsapp','telegram','email')
                               NOT NULL DEFAULT '',
  best_time_to_call VARCHAR(40)  NULL DEFAULT NULL,
  owner_note        TEXT         NULL DEFAULT NULL,

  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_flat_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LISTINGS
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. BOOKINGS
-- ─────────────────────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_flats_owner        ON flats(owner_id);
CREATE INDEX IF NOT EXISTS idx_flats_city         ON flats(city);
CREATE INDEX IF NOT EXISTS idx_flats_available    ON flats(available);
CREATE INDEX IF NOT EXISTS idx_flats_type         ON flats(type);
CREATE INDEX IF NOT EXISTS idx_flats_rent         ON flats(rent);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant    ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_flat      ON bookings(flat_id);
CREATE INDEX IF NOT EXISTS idx_bookings_overlap   ON bookings(flat_id, status, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_listings_status    ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_owner     ON listings(owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ██  EXISTING DATABASE?
--     Run ONLY the blocks below — safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── ALTER users ──────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone       VARCHAR(20)  NULL DEFAULT NULL AFTER status,
  ADD COLUMN IF NOT EXISTS whatsapp    VARCHAR(20)  NULL DEFAULT NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS telegram    VARCHAR(80)  NULL DEFAULT NULL AFTER whatsapp,
  ADD COLUMN IF NOT EXISTS location    VARCHAR(120) NULL DEFAULT NULL AFTER telegram,
  ADD COLUMN IF NOT EXISTS languages   VARCHAR(200) NULL DEFAULT NULL AFTER location,
  ADD COLUMN IF NOT EXISTS bio         TEXT         NULL DEFAULT NULL AFTER languages;

-- ── ALTER flats ───────────────────────────────────────────────────────────────
ALTER TABLE flats
  ADD COLUMN IF NOT EXISTS available_from    DATE          NULL DEFAULT NULL AFTER available,
  ADD COLUMN IF NOT EXISTS deposit           DECIMAL(10,2) NULL DEFAULT NULL AFTER available_from,
  ADD COLUMN IF NOT EXISTS floor             SMALLINT      NULL DEFAULT NULL AFTER deposit,
  ADD COLUMN IF NOT EXISTS total_floors      SMALLINT      NULL DEFAULT NULL AFTER floor,
  ADD COLUMN IF NOT EXISTS area_sqft         SMALLINT      NULL DEFAULT NULL AFTER total_floors,
  ADD COLUMN IF NOT EXISTS bathrooms         VARCHAR(5)    NULL DEFAULT NULL AFTER area_sqft,
  ADD COLUMN IF NOT EXISTS parking           ENUM('none','bike','car','both') NOT NULL DEFAULT 'none' AFTER bathrooms,
  ADD COLUMN IF NOT EXISTS facing            VARCHAR(20)   NULL DEFAULT NULL AFTER parking,
  ADD COLUMN IF NOT EXISTS preferred_tenants ENUM('any','family','bachelors','working_women','students') NOT NULL DEFAULT 'any' AFTER facing,
  ADD COLUMN IF NOT EXISTS food_preference   ENUM('any','veg','nonveg') NOT NULL DEFAULT 'any' AFTER preferred_tenants,
  ADD COLUMN IF NOT EXISTS pets_allowed      TINYINT(1)   NOT NULL DEFAULT 0 AFTER food_preference,
  ADD COLUMN IF NOT EXISTS smoking_allowed   TINYINT(1)   NOT NULL DEFAULT 0 AFTER pets_allowed,
  ADD COLUMN IF NOT EXISTS visitors_allowed  TINYINT(1)   NOT NULL DEFAULT 0 AFTER smoking_allowed,
  ADD COLUMN IF NOT EXISTS landmarks         VARCHAR(400) NULL DEFAULT NULL AFTER amenities,
  -- ▼ NEW in v3: Cloudinary public IDs for server-side deletion
  ADD COLUMN IF NOT EXISTS image_public_ids  JSON         NULL DEFAULT NULL AFTER images,
  ADD COLUMN IF NOT EXISTS contact_phone     VARCHAR(20)  NULL DEFAULT NULL AFTER image_public_ids,
  ADD COLUMN IF NOT EXISTS contact_whatsapp  VARCHAR(20)  NULL DEFAULT NULL AFTER contact_phone,
  ADD COLUMN IF NOT EXISTS contact_email     VARCHAR(255) NULL DEFAULT NULL AFTER contact_whatsapp,
  ADD COLUMN IF NOT EXISTS contact_telegram  VARCHAR(80)  NULL DEFAULT NULL AFTER contact_email,
  ADD COLUMN IF NOT EXISTS preferred_contact ENUM('','phone','whatsapp','telegram','email') NOT NULL DEFAULT '' AFTER contact_telegram,
  ADD COLUMN IF NOT EXISTS best_time_to_call VARCHAR(40)  NULL DEFAULT NULL AFTER preferred_contact,
  ADD COLUMN IF NOT EXISTS owner_note        TEXT         NULL DEFAULT NULL AFTER best_time_to_call;

-- ── ALTER listings ────────────────────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL DEFAULT NULL AFTER status;

-- ── Extra indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_listings_owner ON listings(owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- REFERENCE QUERIES FOR server.js
-- ─────────────────────────────────────────────────────────────────────────────

/*
── POST /api/flats ──────────────────────────────────────────────────────────────
   req.body now contains:
     images           : string[]   (Cloudinary secure_url values)
     image_public_ids : string[]   (Cloudinary public_id values)

   In server.js:
     const images          = JSON.stringify(req.body.images          || []);
     const image_public_ids = JSON.stringify(req.body.image_public_ids || []);

   Then insert both columns into flats.

── DELETE /api/flats/:id  (optional — delete images from Cloudinary) ───────────
   Install:  npm install cloudinary
   Config:   cloudinary.config({ cloud_name, api_key, api_secret });

   const [rows] = await db.query('SELECT image_public_ids FROM flats WHERE id=?', [id]);
   const publicIds = JSON.parse(rows[0]?.image_public_ids || '[]');
   if (publicIds.length) {
     await cloudinary.api.delete_resources(publicIds);
   }
   await db.query('DELETE FROM flats WHERE id=?', [id]);

── GET /api/flats  (tenant search) ─────────────────────────────────────────────
SELECT
  f.id, f.title, f.city, f.address, f.rent, f.type, f.furnished, f.available,
  f.available_from, f.deposit, f.floor, f.total_floors, f.area_sqft,
  f.bathrooms, f.parking, f.facing, f.preferred_tenants, f.food_preference,
  f.pets_allowed, f.smoking_allowed, f.visitors_allowed,
  f.description, f.amenities, f.landmarks,
  f.images,            -- Cloudinary URLs array (image_public_ids NOT sent to frontend)
  f.contact_phone, f.contact_whatsapp, f.contact_email, f.contact_telegram,
  f.preferred_contact, f.best_time_to_call, f.owner_note,
  u.name AS owner_name, u.phone AS owner_phone,
  u.whatsapp AS owner_whatsapp, u.telegram AS owner_telegram,
  u.email AS owner_email, u.bio AS owner_bio,
  l.status AS listing_status
FROM flats f
JOIN listings l ON l.flat_id = f.id AND l.status = 'approved'
JOIN users    u ON u.id = f.owner_id
WHERE f.available = 1
ORDER BY f.created_at DESC;

NOTE: Never return image_public_ids to the frontend — they are internal
      identifiers only used by the server for Cloudinary deletion.

── GET /api/listings  (owner dashboard) ────────────────────────────────────────
SELECT
  l.id, l.status, l.submitted_at, l.rejection_reason,
  f.id    AS flat_id,
  f.title AS flat_title,
  f.city, f.type, f.rent, f.images,
  u.name  AS reviewer_name
FROM listings l
JOIN flats     f ON f.id = l.flat_id
LEFT JOIN users u ON u.id = l.reviewed_by
WHERE l.owner_id = ?
ORDER BY l.submitted_at DESC;

── PATCH /api/me  (owner profile update) ────────────────────────────────────────
UPDATE users
SET name=?, email=?, phone=?, whatsapp=?, telegram=?,
    location=?, languages=?, bio=?, updated_at=NOW()
WHERE id=?;
*/
