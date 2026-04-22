import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../db.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    
    // In mysql2/promise, pool.getConnection() returns a promise connection
    const connection = await pool.promise().getConnection();
    for (const stmt of statements) {
      await connection.query(stmt);
    }
    connection.release();
    logger.info('Database schema migration completed successfully.');
  } catch (err) {
    logger.error('Migration failed:', err.message);
    throw err;
  }
}
