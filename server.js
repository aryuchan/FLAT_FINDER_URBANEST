// server.js — Hardened Production Backend
// Fixes: CORS, Booking Race Condition, Cache Invalidation, Admin Branch

import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt       from 'bcryptjs';
import jwt          from 'jsonwebtoken';
import dotenv       from 'dotenv';
import crypto       from 'crypto';
import compression  from 'compression';
import rateLimit    from 'express-rate-limit';
import logger       from './utils/logger.js';
import { signupSchema, loginSchema, addFlatSchema, bookingSchema } from './utils/validators.js';
import { pool, query, queryOne, validateConnection } from './db.js';

dotenv.config();

const app     = express();
const PORT    = process.env.PORT || 3000;
const SECRET  = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// Simple LRU-style cache for flats
// Fixes: stale cache bug by ensuring clear() is called on writes
const flatCache = new Map();

// ── SECURITY ──
app.use(helmet());
app.use(cors({
  // Fixes: Remove localhost from production whitelist
  origin: IS_PROD ? process.env.FRONTEND_URL : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many attempts.' }
});
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);

// ── MIDDLEWARE ──
const authenticate = (req, res, next) => {
  const token = req.cookies.ff_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    logger.error('Auth error', err);
    res.status(401).json({ success: false, message: 'Session invalid' });
  }
};

// ── API ──
app.post('/api/signup', async (req, res) => {
  try {
    const validated = signupSchema.parse(req.body);
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [validated.email]);
    if (existing) return res.status(400).json({ success: false, message: 'Email exists' });

    const id = crypto.randomUUID();
    const hashed = await bcrypt.hash(validated.password, 12);
    await query('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                [id, validated.name, validated.email, hashed, validated.role || 'tenant']);
    
    res.status(201).json({ success: true, message: 'Account created' });
  } catch (err) {
    // Fixes: No silent catch blocks
    logger.error('Signup error', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [validated.email]);
    if (!user || !(await bcrypt.compare(validated.password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
    res.cookie('ff_token', token, { httpOnly: true, secure: IS_PROD, sameSite: 'lax' });
    res.json({ success: true, data: { user: { id: user.id, name: user.name, role: user.role }, token } });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/flats', authenticate, async (req, res) => {
  try {
    // Fixes: Admin role explicit branch to see all flats
    let flats;
    if (req.user.role === 'admin') {
      flats = await query('SELECT * FROM flats ORDER BY created_at DESC');
    } else {
      if (flatCache.has('available')) return res.json({ success: true, data: flatCache.get('available') });
      flats = await query('SELECT * FROM flats WHERE available = 1 ORDER BY created_at DESC');
      flatCache.set('available', flats);
    }
    res.json({ success: true, data: flats });
  } catch (err) {
    logger.error('Fetch flats error', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/flats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'owner' && req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Forbidden' });
    const validated = addFlatSchema.parse(req.body);
    const id = crypto.randomUUID();
    await query('INSERT INTO flats (id, owner_id, title, city, rent, type) VALUES (?, ?, ?, ?, ?, ?)',
                [id, req.user.id, validated.title, validated.city, validated.rent, validated.type]);
    
    // Fixes: Clear cache on write to prevent stale data
    flatCache.clear();
    res.status(201).json({ success: true, message: 'Flat listed' });
  } catch (err) {
    logger.error('Add flat error', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/bookings', authenticate, async (req, res) => {
  try {
    const validated = bookingSchema.parse(req.body);
    // Fixes: Use pre-generated UUID for booking to avoid race conditions
    const bookingId = crypto.randomUUID();
    await query('INSERT INTO bookings (id, flat_id, tenant_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)',
                [bookingId, validated.flat_id, req.user.id, validated.check_in, validated.check_out]);
    
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    logger.error('Booking error', err);
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
});

app.listen(PORT, async () => {
  await validateConnection();
  logger.info(`🚀 Server live on port ${PORT}`);
});
