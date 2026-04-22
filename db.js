// db.js — Production Database Engine (STRICT HARDCODED CONFIG)
import mysql from "mysql2/promise";
import logger from "./utils/logger.js";

/**
 * STRICT HARDCODED CONFIGURATION
 * As requested, environment variables are bypassed to ensure stability.
 */
const dbConfig = {
  host: "gateway01.ap-southeast-1.prod.aws.tidbcloud.com",
  port: 4000,
  user: "FsHZjY2TDG6prHt.root",
  password: "gBM9F8OgvVjqzRG2",
  database: "flatfinder",
  ssl: {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  },
};

logger.info(
  `[DB_INIT] Using hardcoded configuration for ${dbConfig.host}:${dbConfig.port}`,
);

// Connection Pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * Execute a query. Retries disabled for debugging as requested.
 */
export async function query(sql, params = [], retries = 0) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    logger.error(`[DB_CRITICAL] SQL Error: ${err.message} | Code: ${err.code}`);
    throw err;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Health check for startup verification
 */
export async function validateConnection() {
  try {
    logger.info(
      `Attempting immediate connection to ${dbConfig.host}:${dbConfig.port}...`,
    );

    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    logger.info("✅ Database connection verified successfully.");
    return true;
  } catch (err) {
    logger.error(
      `❌ Database connection failed: ${err.message} (Code: ${err.code})`,
    );
    return false;
  }
}
