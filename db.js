// db.js — Industry-grade MySQL Module (Railway + Render Optimized)
// ─────────────────────────────────────────────────────────────────
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const IS_PROD = process.env.NODE_ENV === 'production';

// ── ENV RESOLUTION ────────────────────────────────────────────────
const DB_HOST     = process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost';
const DB_PORT     = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
const DB_USER     = process.env.MYSQLUSER     || process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const DB_NAME     = process.env.MYSQLDATABASE || process.env.DB_NAME     || 'flatfinder';

// ── SSL CONFIG ────────────────────────────────────────────────────
// Required for cloud providers like TiDB Cloud and Aiven
const sslConfig = IS_PROD ? {
  rejectUnauthorized: false,
  minVersion: 'TLSv1.2'
} : false;

// ── POOL CONFIG ───────────────────────────────────────────────────
const poolConfig = {
  host:               DB_HOST,
  port:               DB_PORT,
  user:               DB_USER,
  password:           DB_PASSWORD,
  database:           DB_NAME,
  ssl:                sslConfig,
  waitForConnections: true,
  connectionLimit:    IS_PROD ? 15 : 5,
  queueLimit:         0,
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
  connectTimeout:     15000,
  multipleStatements: false, // SECURITY: Prevent SQL Injection
};

const pool = mysql.createPool(poolConfig);

/**
 * Executes a SQL query with parameters.
 */
export async function query(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error(`[db.js] Query Error: ${err.message}`);
    throw err;
  }
}

/**
 * Executes a SQL query and returns the first row.
 */
export async function queryOne(sql, params = []) {
  const results = await query(sql, params);
  return results[0] || null;
}

/**
 * Validates the database connection on startup.
 */
export async function validateConnection() {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    
    console.log('[db.js] ✅ MySQL connection established successfully.');
    if (IS_PROD) {
      console.log(`[db.js]    Host     : ${DB_HOST}`);
      console.log(`[db.js]    Database : ${DB_NAME}`);
      console.log(`[db.js]    SSL      : ${sslConfig ? 'Enabled (TLSv1.2)' : 'Disabled'}`);
    }
    return true;
  } catch (err) {
    console.error('╔══════════════════════════════════════════════╗');
    console.error('║  ❌  DATABASE CONNECTION FAILED               ║');
    console.error('╚══════════════════════════════════════════════╝');
    console.error(`[db.js] Error Code: ${err.code}`);
    console.error(`[db.js] Message   : ${err.message}`);
    console.error(`[db.js] Check your Environment Variables (MYSQLHOST, etc.)`);
    
    if (IS_PROD) process.exit(1);
    return false;
  }
}

export { pool };
export default pool;
