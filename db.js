// db.js — Production Database Engine (v18.0)
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

let dbConfig;
const dbUrl = process.env.DATABASE_URL;

if (dbUrl) {
  // Production (Railway/Render)
  const url = new URL(dbUrl);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    port: parseInt(url.port || '3306', 10),
    ssl: { rejectUnauthorized: false }, // Critical for cloud providers
  };
} else {
  // Local Development
  dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'urbanest',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  };
}

// Hardened Connection Pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Execute a query with automatic retries for ephemeral cloud connections
 */
export async function query(sql, params = [], retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const [results] = await pool.execute(sql, params);
      return results;
    } catch (err) {
      if (i === retries - 1) {
        logger.error(`[DB_CRITICAL] SQL: ${sql} | Error: ${err.message}`);
        throw err;
      }
      logger.warn(`[DB_RETRY] ${i + 1}/${retries} - ${err.message}`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
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
    logger.info('Database connection verified.');
    return true;
  } catch (err) {
    logger.error('Database connection failed:', err.message);
    return false;
  }
}
