// db.js — Production-Grade self-healing MySQL Pool
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

let dbConfig;

// Priority 1: DATABASE_URL (Render, PlanetScale, any external MySQL)
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    port: parseInt(url.port || '3306', 10),
  };
// Priority 2: Railway individual env vars
} else if (process.env.MYSQLHOST) {
  dbConfig = {
    host:     process.env.MYSQLHOST,
    user:     process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port:     parseInt(process.env.MYSQLPORT || '3306', 10),
  };
} else {
  console.error('FATAL: No database configuration found. Set DATABASE_URL or MYSQL* vars.');
  process.exit(1);
}

const poolConfig = {
  ...dbConfig,
  ssl: { rejectUnauthorized: false },  // Required for Railway, Render, PlanetScale, TiDB
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '5', 10),  // 5 default (Render-safe)
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,               // 30s — handles Render cold starts on DB side
};

export const pool = mysql.createPool(poolConfig);

// FIX [6]: Removed invalid pool.on('error') event handler which is unsupported in mysql2

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
