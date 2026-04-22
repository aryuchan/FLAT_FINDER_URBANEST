import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../db.js";
import logger from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  const connection = await pool.getConnection();
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");

    // Split on statement-ending semicolons, ignoring those inside quotes/comments
    const statements = sql
      .replace(/--[^\n]*\n/g, "\n") // strip line comments
      .replace(/\/\*[\s\S]*?\*\//g, "") // strip block comments
      .split(/;\s*(?=\S|$)/)
      .map((s) => s.trim())
      .filter(Boolean);

    await connection.beginTransaction();
    for (const stmt of statements) {
      await connection.query(stmt);
    }

    // Dynamic Column Sync (Ensure v19.2 columns exist)
    const addCols = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20)",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS description TEXT",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS deposit DECIMAL(10,2) DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS floor INT DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS total_floors INT DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS area_sqft INT DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS parking ENUM('none', 'bike', 'car', 'both') DEFAULT 'none'",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS preferred_tenants ENUM('any', 'family', 'bachelors', 'working_women', 'students') DEFAULT 'any'",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS food_preference ENUM('any', 'veg', 'nonveg') DEFAULT 'any'",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS furnished TINYINT(1) DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS bathrooms VARCHAR(10) DEFAULT ''",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS facing VARCHAR(50) DEFAULT ''",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS landmarks TEXT",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS pets_allowed TINYINT(1) DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS smoking_allowed TINYINT(1) DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS visitors_allowed TINYINT(1) DEFAULT 0",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS images LONGTEXT",
      "ALTER TABLE flats ADD COLUMN IF NOT EXISTS amenities LONGTEXT",
      "ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_rent DECIMAL(12,2) DEFAULT 0"
    ];
    for (const stmt of addCols) {
      try { await connection.query(stmt); } catch (e) { /* ignore */ }
    }

    await connection.commit();

    logger.info("Database schema migration completed successfully.");
  } catch (err) {
    await connection.rollback().catch(() => {}); // best-effort rollback
    logger.error("Migration failed:", err.message);
    throw err;
  } finally {
    connection.release(); // always released, even on error
  }
}
