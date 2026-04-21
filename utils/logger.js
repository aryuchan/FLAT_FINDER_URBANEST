// utils/logger.js — Hardened Production Logger
// Fixes: Bug #2 — Missing utility crash

export default {
  info:  (...a) => console.log('[INFO]',  ...a),
  warn:  (...a) => console.warn('[WARN]', ...a),
  error: (...a) => console.error('[ERR]', ...a),
};
