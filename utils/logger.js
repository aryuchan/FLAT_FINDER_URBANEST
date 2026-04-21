// utils/logger.js — Hardened Production Logger
// Fixes: Bug #8 — Wrapping console with [INFO]/[ERROR] prefixes

const logger = {
  info: (msg, ...meta) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, ...meta);
  },
  error: (msg, ...meta) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, ...meta);
  },
  warn: (msg, ...meta) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, ...meta);
  }
};

export default logger;
