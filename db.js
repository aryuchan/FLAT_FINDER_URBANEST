// db.js — Production Hardened Database Engine
import mysql from "mysql2/promise";
import logger from "./utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

const dbName = process.env.DB_DATABASE || process.env.DB_NAME || "flatfinder";
const useDatabaseUrl = Boolean(process.env.DATABASE_URL);
const dbUrl = useDatabaseUrl ? new URL(process.env.DATABASE_URL) : null;
const isLocalHost = (host) => ["localhost", "127.0.0.1"].includes(String(host || "").toLowerCase());
const sslEnabled = process.env.DB_SSL
  ? String(process.env.DB_SSL).toLowerCase() !== "false"
  : !(useDatabaseUrl ? isLocalHost(dbUrl.hostname) : isLocalHost(process.env.DB_HOST));

const dbConfig = useDatabaseUrl
  ? {
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 3306),
      user: decodeURIComponent(dbUrl.username || "root"),
      password: decodeURIComponent(dbUrl.password || ""),
      database: decodeURIComponent(dbUrl.pathname?.replace(/^\//, "") || dbName),
    }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: dbName,
    };

if (sslEnabled) {
  dbConfig.ssl = {
    rejectUnauthorized: false,
    minVersion: "TLSv1.2",
  };
}

logger.info(`[DB_INIT] Connecting to ${dbConfig.host}:${dbConfig.port}`);

// Connection Pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 20,
  maxIdle: 20,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

/**
 * Enhanced Query Executor with Retry Logic (Exponential Backoff)
 */
export async function query(sql, params = [], retries = 3) {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (err) {
      attempt++;
      const isTransient = [
        "PROTOCOL_CONNECTION_LOST",
        "ECONNRESET",
        "ETIMEDOUT",
      ].includes(err.code);

      if (isTransient && attempt <= retries) {
        const delay = Math.pow(2, attempt) * 100;
        logger.warn(
          `[DB_RETRY] Attempt ${attempt}/${retries} failed (${err.code}). Retrying in ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      logger.error({
        message: `[DB_CRITICAL] SQL Failure`,
        code: err.code,
        query: sql.substring(0, 500),
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
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
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    logger.info("✅ Database connectivity verified.");
    return true;
  } catch (err) {
    logger.error(
      `❌ Database verification failed: ${err.message} (Code: ${err.code})`,
    );
    return false;
  }
}
