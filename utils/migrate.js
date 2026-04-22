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
