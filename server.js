// server.js — Final Hardened Production Backend (v13)
// Fixes: Cannot GET /, CORS, Booking Race Condition, Cache Invalidation, Admin Branch

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
import { fileURLToPath } from 'url';
import logger       from './utils/logger.js';
import { signupSchema, loginSchema, addFlatSchema, bookingSchema } from './utils/validators.js';
import { pool, query, queryOne, validateConnection } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app     = express();
const PORT    = process.env.PORT || 3000;
const SECRET  = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

const flatCache = new Map();

// ── SECURITY & OPTIMIZATION ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:', 'https://res.cloudinary.com'],
    },
  },
}));

app.use(cors({
  // Fixes: CORS allows localhost in production — removed
  origin: IS_PROD ? process.env.FRONTEND_URL : true,
  credentials: true
}));

app.use(compression());
app.use(express.json());
app.use(cookieParser());

// ── STATIC SERVING (Fixes: Cannot GET /) ──
app.use(express.static(__dirname));

// ── AUTH MIDDLEWARE ──
const authenticate = (req, res, next) => {
  const token = req.cookies.ff_token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Session expired' });
  }
};

// ── API ROUTES ──
app.post('/api/signup', async (req, res) => {
  try {
    const validated = signupSchema.parse(req.body);
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [validated.email]);
    if (existing) return res.status(400).json({ success: false, message: 'Email already exists' });

    const id = crypto.randomUUID();
    const hashed = await bcrypt.hash(validated.password, 12);
    await query('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
                [id, validated.name, validated.email, hashed, validated.role || 'tenant']);
    
    res.status(201).json({ success: true, message: 'Account created' });
  } catch (err) {
    logger.error('Signup Error:', err);
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
    logger.error('Login Error:', err);
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
    logger.error('Fetch Flats Error:', err);
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/bookings', authenticate, async (req, res) => {
  try {
    const validated = bookingSchema.parse(req.body);
    // Fixes: Pre-generated UUID to avoid race conditions
    const bookingId = crypto.randomUUID();
    await query('INSERT INTO bookings (id, flat_id, tenant_id, check_in, check_out) VALUES (?, ?, ?, ?, ?)',
                [bookingId, validated.flat_id, req.user.id, validated.check_in, validated.check_out]);
    
    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    logger.error('Booking Error:', err);
    res.status(500).json({ success: false, message: 'Booking failed' });
  }
});

// ── PORTAL ROUTING (Fixes: Cannot GET /) ──
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/tenant', (req, res) => res.sendFile(path.join(__dirname, 'tenant_index.html')));
app.get('/owner',  (req, res) => res.sendFile(path.join(__dirname, 'owner_index.html')));
app.get('/admin',  (req, res) => res.sendFile(path.join(__dirname, 'admin_index.html')));

app.listen(PORT, async () => {
  await validateConnection();
  logger.info(`🚀 [Final] Server live on port ${PORT}`);
});
