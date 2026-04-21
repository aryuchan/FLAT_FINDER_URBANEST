// db.js — Railway-compatible MySQL Connection Pool
// Reads Railway plugin env vars (MYSQLHOST, MYSQLUSER, etc.)
// Falls back to DB_* vars for local development.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// ── ENV RESOLUTION ────────────────────────────────────────────────
// Railway MySQL plugin injects: MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
// Local .env may use the same names (recommended) or the legacy DB_* prefix.
const DB_HOST     = process.env.MYSQLHOST     || process.env.DB_HOST     || 'localhost';
const DB_PORT     = parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10);
const DB_USER     = process.env.MYSQLUSER     || process.env.DB_USER     || 'root';
const DB_PASSWORD = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '';
const DB_NAME     = process.env.MYSQLDATABASE || process.env.DB_NAME     || 'flatfinder';

// ── ENV VALIDATION ────────────────────────────────────────────────
if (!DB_HOST || !DB_USER || !DB_NAME) {
  console.error('[db.js] ❌ Missing required database environment variables.');
  console.error('[db.js]    On Railway: add the MySQL plugin and link it to your service.');
  console.error('[db.js]    Locally:    set MYSQLHOST / MYSQLUSER / MYSQLPASSWORD / MYSQLDATABASE / MYSQLPORT in .env');
  process.exit(1);
}

if (isNaN(DB_PORT) || DB_PORT < 1 || DB_PORT > 65535) {
  console.error(`[db.js] ❌ Invalid port value: "${process.env.MYSQLPORT || process.env.DB_PORT}"`);
  process.exit(1);
}

// ── POOL CONFIG ───────────────────────────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production';

const poolConfig = {
  host:                DB_HOST,
  port:                DB_PORT,
  user:                DB_USER,
  password:            DB_PASSWORD,
  database:            DB_NAME,
  waitForConnections:  true,
  connectionLimit:     IS_PROD ? 20 : 5,  // More connections in production
  queueLimit:          0,
  timezone:            '+00:00',
  charset:             'utf8mb4',
  connectTimeout:      10_000,           // 10 s connect timeout
  enableKeepAlive:     true,
  keepAliveInitialDelay: 30_000,         // 30 s keepalive to prevent dropped idle connections
  decimalNumbers:      true,             // Return DECIMAL as JS number not string
  multipleStatements:  false,            // SECURITY: block SQL injection via stacked statements
};

// ── SSL — Cloud Provider Auto-Detection ──────────────────────────
// Enable SSL for known cloud providers (Railway, TiDB, Aiven, Render)
// If the host is not localhost or internal, we generally assume SSL is needed.
const IS_EXTERNAL_DB = 
  DB_HOST.includes('railway.app') ||
  DB_HOST.includes('onrender.com') ||
  DB_HOST.includes('tidbcloud.com') ||
  DB_HOST.includes('aivencloud.com') ||
  DB_HOST.includes('proxy');

if (IS_EXTERNAL_DB && DB_HOST !== 'localhost') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

// ── CREATE POOL ───────────────────────────────────────────────────
const pool = mysql.createPool(poolConfig);

// ── CONNECTION VALIDATION ─────────────────────────────────────────
// Called once at server startup. Crashes early with a clear message if DB is unreachable.
export async function validateConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('SELECT 1');
    console.log('[db.js] ✅ MySQL connected successfully.');
    console.log(`[db.js]    Host     : ${DB_HOST}`);
    console.log(`[db.js]    Port     : ${DB_PORT}`);
    console.log(`[db.js]    Database : ${DB_NAME}`);
    console.log(`[db.js]    User     : ${DB_USER}`);
  } catch (err) {
    console.error('[db.js] ❌ MySQL connection failed:', err.message);
    console.error('[db.js]    Code  :', err.code);
    console.error('[db.js]    Host  :', DB_HOST);
    console.error('[db.js]    Port  :', DB_PORT);
    console.error('[db.js]    Check : Railway MySQL plugin is linked to this service,');
    console.error('[db.js]            or your local MySQL server is running.');
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

// ── QUERY HELPERS ─────────────────────────────────────────────────
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('[db.js] Query error:', err.message);
    console.error('[db.js] SQL:', sql);
    throw err;
  }
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function transaction(fn) {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    console.error('[db.js] Transaction rolled back:', err.message);
    throw err; // Re-throws original error with stack trace (2b fix)
  } finally {
    conn.release();
  }
}

export { pool }; // Named export for IDEs (2a fix)
export default pool;
