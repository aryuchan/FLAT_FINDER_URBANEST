// db.js — Production Database Engine (v19.0)
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

/**
 * Robust Database Configuration Resolver
 * Prioritizes: 
 * 1. DATABASE_URL (URI string)
 * 2. MYSQL_ prefixed variables (Railway/Managed standard)
 * 3. DB_ prefixed variables (Application standard)
 */
const getDbConfig = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    return {
      uri: dbUrl,
      ssl: { rejectUnauthorized: false }
    };
  }

  // Individual parameters
  const host = process.env.MYSQLHOST || process.env.DB_HOST;
  const user = process.env.MYSQLUSER || process.env.DB_USER;
  const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
  const port = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);

  if (!host) {
    logger.warn('[DB_CONFIG] No database host defined in environment. Connection may fail.');
  }

  return {
    host: host || 'localhost', // Fallback to localhost only as last resort, logging warning above
    user: user || 'root',
    password: password || '',
    database: database || 'urbanest',
    port: port,
    ssl: (process.env.DB_SSL === 'true' || process.env.MYSQLHOST) ? { rejectUnauthorized: false } : undefined
  };
};

const dbConfig = getDbConfig();

// Hardened Connection Pool
export const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
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
      const isConnectionError = ['ECONNRESET', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ECONNREFUSED'].includes(err.code);
      
      if (i === retries - 1 || !isConnectionError) {
        logger.error(`[DB_CRITICAL] SQL Error: ${err.message} | Code: ${err.code}`);
        throw err;
      }
      
      logger.warn(`[DB_RETRY] Attempt ${i + 1}/${retries} - ${err.message}`);
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
    const hostInfo = dbConfig.uri ? 'URI' : `${dbConfig.host}:${dbConfig.port}`;
    logger.info(`Validating connection to database at ${hostInfo}...`);
    
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    
    logger.info('Database connection verified successfully.');
    return true;
  } catch (err) {
    logger.error(`Database connection failed: ${err.message} (Code: ${err.code})`);
    return false;
  }
}

