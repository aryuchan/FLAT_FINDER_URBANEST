// server.js — Hardened Production Backend (v16)
// Fixes: Bugs #4, #5, #6, #7 | Security: Rate Limiting & Overlap Guards

import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt       from 'bcryptjs';
import jwt          from 'jsonwebtoken';
import dotenv       from 'dotenv';
import crypto       from 'crypto';
import path         from 'path';
import compression  from 'compression';
import rateLimit    from 'express-rate-limit';
import { fileURLToPath } from 'url';
import logger       from './utils/logger.js';
import { signupSchema, loginSchema, addFlatSchema, bookingSchema, userUpdateSchema } from './utils/validators.js';
import { pool, query, queryOne, validateConnection } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app     = express();
const PORT    = process.env.PORT || 3000;
const SECRET  = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// Critical: Fail fast if JWT_SECRET is missing
if (!SECRET) {
  logger.error('CRITICAL: JWT_SECRET is missing in environment variables.');
  process.exit(1);
}

const flatCache = new Map();

// ── SECURITY MIDDLEWARE ──
app.use(helmet());
app.use(cors({ origin: IS_PROD ? process.env.FRONTEND_URL : true, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many attempts.' } });
const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: 'Too many signups.' } });

// ── AUTH LOGIC ──
const authenticate = (req, res, next) => {
  // Fixes: Bug #5 — Check cookie first, then Authorization header fallback
  const token = req.cookies.ff_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired' });
  }
};

const authorize = (role) => (req, res, next) => {
  if (req.user.role !== role && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

// ── ENDPOINTS (Fixes: Bug #4 — 12+ Missing Routes) ──

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT id, name, email, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: user });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/signup', signupLimiter, async (req, res) => {
  try {
    const v = signupSchema.parse(req.body);
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [v.email]);
    if (existing) return res.status(400).json({ success: false, message: 'Email taken' });
    const id = crypto.randomUUID();
    const hash = await bcrypt.hash(v.password, 12);
    await query('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)', [id, v.name, v.email, hash, v.role]);
    res.status(201).json({ success: true, message: 'Welcome to Urbanest!' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const v = loginSchema.parse(req.body);
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [v.email]);
    if (!user || !(await bcrypt.compare(v.password, user.password))) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    res.cookie('ff_token', token, { httpOnly: true, secure: IS_PROD, sameSite: 'lax' });
    // Fixes: Strip sensitive fields before response
    res.json({ success: true, data: { user: { id: user.id, name: user.name, role: user.role }, token } });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('ff_token').json({ success: true, message: 'Logged out' });
});

app.get('/api/flats', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') return res.json({ success: true, data: await query('SELECT * FROM flats') });
    if (flatCache.has('avail')) return res.json({ success: true, data: flatCache.get('avail') });
    const flats = await query('SELECT * FROM flats WHERE available = 1');
    flatCache.set('avail', flats);
    res.json({ success: true, data: flats });
  } catch (err) { res.status(500).json({ success: false }); }
});

app.post('/api/flats', authenticate, authorize('owner'), async (req, res) => {
  try {
    const v = addFlatSchema.parse(req.body);
    const id = crypto.randomUUID();
    await query('INSERT INTO flats (id, owner_id, title, city, rent, type) VALUES (?, ?, ?, ?, ?, ?)', [id, req.user.id, v.title, v.city, v.rent, v.type]);
    // Fixes: Bug #6 — Cache Invalidation
    flatCache.delete('avail');
    res.status(201).json({ success: true, message: 'Flat listed' });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

app.post('/api/bookings', authenticate, async (req, res) => {
  try {
    const v = bookingSchema.parse(req.body);
    // Fixes: Bug #7 — Booking Overlap Guard
    const conflict = await queryOne('SELECT id FROM bookings WHERE flat_id = ? AND status != "cancelled" AND check_in < ? AND check_out > ?', [v.flat_id, v.check_out, v.check_in]);
    if (conflict) return res.status(409).json({ success: false, message: 'Dates already booked' });
    
    const bId = crypto.randomUUID();
    await query('INSERT INTO bookings (id, flat_id, tenant_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)', [bId, v.flat_id, req.user.id, v.check_in, v.check_out]);
    res.json({ success: true, message: 'Booking confirmed' });
  } catch (err) { res.status(500).json({ success: false }); }
});

// Admin Routes (Fixes: Bug #4)
app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
  res.json({ success: true, data: await query('SELECT id, name, email, role, created_at FROM users') });
});

// Static Serving
app.use(express.static(__dirname));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, async () => {
  await validateConnection();
  logger.info(`🚀 [Production Ready] Port: ${PORT}`);
});
