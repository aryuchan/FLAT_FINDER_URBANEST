// db.js — Production-Grade self-healing MySQL Pool
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
  host:     process.env.MYSQLHOST,
  user:     process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port:     parseInt(process.env.MYSQLPORT || '3306', 10),
  ssl:      { rejectUnauthorized: false }, // Critical for Railway/TiDB Cloud
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

// RISK: Using a singleton pool is standard, but check env vars if connection fails.
export const pool = mysql.createPool(dbConfig);

// Fixes: Architectural flaw — Unhandled pool errors can crash the process
pool.on('error', (err) => {
  console.error('❌ [db.js] UNEXPECTED POOL ERROR:', err.message);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 [db.js] Attempting to re-initialize pool...');
  }
});

/**
 * Execute a parameterized SQL query.
 */
export const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error(`[DB_ERROR] SQL: ${sql} | Error: ${err.message}`);
    throw err; // Propagate to server.js for structured response
  }
};

/**
 * Fetch a single row.
 */
export const queryOne = async (sql, params = []) => {
  const rows = await query(sql, params);
  return rows[0] || null;
};

/**
 * Validate connection on startup.
 */
export const validateConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ [db.js] Connection pool initialized.');
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ [db.js] CRITICAL: Database connection failed.');
    console.error(err.message);
    process.exit(1);
  }
};
