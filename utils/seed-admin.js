import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import { pool } from "../db.js";
import logger from "./logger.js";

dotenv.config();

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    logger.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping seed-admin.");
    process.exit(0);
  }

  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );
    if (rows.length > 0) {
      logger.info(`Admin user ${email} already exists.`);
    } else {
      const hashed = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      await connection.query(
        "INSERT INTO users (id, name, email, password, role, status) VALUES (?, ?, ?, ?, ?, ?)",
        [id, "System Administrator", email, hashed, "admin", "active"],
      );
      logger.info(`Admin user ${email} successfully created.`);
    }
    connection.release();
    process.exit(0);
  } catch (err) {
    logger.error("Seed Admin failed:", err.message);
    process.exit(1);
  }
}

seedAdmin();
