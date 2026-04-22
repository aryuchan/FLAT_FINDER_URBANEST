// server.js — FlatFinder API Server
// Industry-grade Express + MySQL + JWT backend
// Railway-ready: reads MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT
// ─────────────────────────────────────────────────────────────────
import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import cookieParser from 'cookie-parser';
import bcrypt       from 'bcryptjs';
import jwt          from 'jsonwebtoken';
import dotenv       from 'dotenv';
import path         from 'path';
import fs           from 'fs';
import { fileURLToPath } from 'url';
import { query, queryOne, validateConnection } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app        = express();
const PORT       = parseInt(process.env.PORT || '3000', 10);
const SECRET     = process.env.JWT_SECRET;
const SALT_ROUNDS = 12;
const IS_PROD    = process.env.NODE_ENV === 'production';

// Required for Railway / any reverse-proxy: trusts X-Forwarded-* headers
// so req.ip, req.protocol, and secure cookies work correctly.
app.set('trust proxy', 1);

// ── GUARD: JWT_SECRET must be set ────────────────────────────────
if (!SECRET) {
  console.error('[server.js] ❌ JWT_SECRET is not set. Add it to your .env / Railway Variables.');
  process.exit(1);
}

// ── CONSTANTS ────────────────────────────────────────────────────
const VALID_ROLES    = ['tenant', 'owner', 'admin'];
const VALID_TYPES    = ['1BHK', '2BHK', '3BHK', 'Studio', '4BHK+'];
const VALID_STATUSES = {
  booking: ['confirmed', 'cancelled'],
  listing: ['approved', 'rejected'],
  user:    ['active', 'suspended'],
};

// ── CLOUDINARY (server-side, for image deletion only) ─────────────
// Loaded lazily — never crashes if cloudinary package is absent.
let cloudinaryApi = null;
(async () => {
  const { CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_CLOUD_NAME } = process.env;
  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET && CLOUDINARY_CLOUD_NAME) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key:    CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
      });
      cloudinaryApi = cloudinary;
      console.log('[server.js] ✅ Cloudinary SDK configured for server-side deletions.');
    } catch (_) {
      console.warn('[server.js] ⚠️  cloudinary npm package not installed — images will NOT be deleted from Cloudinary on flat removal.');
      console.warn('[server.js]    Run: npm install cloudinary');
    }
  } else {
    console.warn('[server.js] ⚠️  Cloudinary API credentials missing — image deletion from Cloudinary disabled.');
    console.warn('[server.js]    Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Railway Variables.');
  }
})();

// ── CORS ─────────────────────────────────────────────────────────
const ALLOWED_ORIGINS  = (process.env.FRONTEND_ORIGIN || '')
  .split(',').map(o => o.trim()).filter(Boolean);

const LOCAL_ORIGIN_RE   = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const RAILWAY_ORIGIN_RE = /^https?:\/\/[\w-]+\.up\.railway\.app$/;

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin === 'null') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin))  return cb(null, true);
    if (LOCAL_ORIGIN_RE.test(origin))      return cb(null, true);
    if (RAILWAY_ORIGIN_RE.test(origin))    return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── MIDDLEWARE ───────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
// Limit raised to 512 KB — flat payloads contain Cloudinary HTTPS URLs (short strings),
// never raw base64 blobs; 512 KB is safe headroom for up to 8 URLs + all text fields.
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));
app.use(cookieParser());

// ── CLOUDINARY META TAG INJECTION ────────────────────────────────
// Serves HTML files with {{CLOUDINARY_CLOUD_NAME}} and {{CLOUDINARY_UPLOAD_PRESET}}
// replaced from env. API key / secret are NEVER injected.
const CLOUD_NAME    = (process.env.CLOUDINARY_CLOUD_NAME    || '').replace(/^["']|["']$/g, '');
const UPLOAD_PRESET = (process.env.CLOUDINARY_UPLOAD_PRESET || '').replace(/^["']|["']$/g, '');

function serveInjectedHtml(htmlFile, req, res) {
  const filePath = path.join(__dirname, htmlFile);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(`[server.js] HTML file not found: ${filePath}`);
      return res.status(404).send('Page not found.');
    }
    const injected = data
      .replace(/\{\{CLOUDINARY_CLOUD_NAME\}\}/g,    CLOUD_NAME)
      .replace(/\{\{CLOUDINARY_UPLOAD_PRESET\}\}/g, UPLOAD_PRESET);
    res
      .setHeader('Content-Type', 'text/html; charset=utf-8')
      .setHeader('Cache-Control', 'no-cache')
      .send(injected);
  });
}

// Role-specific entry points (served BEFORE static middleware)
app.get('/',                  (req, res) => serveInjectedHtml('index.html',         req, res));
app.get('/index.html',        (req, res) => serveInjectedHtml('index.html',         req, res));
app.get('/owner',             (req, res) => serveInjectedHtml('owner_index.html',   req, res));
app.get('/owner_index.html',  (req, res) => serveInjectedHtml('owner_index.html',   req, res));
app.get('/admin',             (req, res) => serveInjectedHtml('admin_index.html',   req, res));
app.get('/admin_index.html',  (req, res) => serveInjectedHtml('admin_index.html',   req, res));
app.get('/tenant',            (req, res) => serveInjectedHtml('tenant_index.html',  req, res));
app.get('/tenant_index.html', (req, res) => serveInjectedHtml('tenant_index.html',  req, res));

// ── RESPONSE HELPERS ─────────────────────────────────────────────
const ok   = (res, data, message = 'OK', code = 200) =>
  res.status(code).json({ success: true, data, message });
const fail = (res, message = 'Error', code = 400) =>
  res.status(code).json({ success: false, data: null, message });
const strip = ({ password, ...u }) => u;

// ── JWT HELPERS ──────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: '7d' });
}

function setTokenCookie(res, token) {
  res.cookie('ff_token', token, {
    httpOnly: true,
    secure:   IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000,
    path:     '/',
  });
}

// ── VALIDATION HELPERS ───────────────────────────────────────────
const isValidEmail    = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const isValidPassword = (p) => typeof p === 'string' && p.length >= 6;

// ── AUTH MIDDLEWARE ──────────────────────────────────────────────
function authenticate(req, res, next) {
  const token =
    req.cookies?.ff_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!token) return fail(res, 'Unauthorized — please log in.', 401);

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expired. Please log in again.'
      : 'Invalid session. Please log in again.';
    return fail(res, msg, 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return fail(res, 'Forbidden — insufficient permissions.', 403);
    next();
  };
}

// ── DB ERROR HANDLER ─────────────────────────────────────────────
function handleDbError(res, err, context) {
  console.error(`[${context}]`, err.code || '', err.message);
  if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_NO_DB_ERROR')
    return fail(res, 'Database tables not found. Run schema.sql against your Railway MySQL first.', 503);
  if (err.code === 'ECONNREFUSED' || err.code === 'ER_ACCESS_DENIED_ERROR')
    return fail(res, 'Cannot connect to MySQL. Check MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE in Railway Variables.', 503);
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST')
    return fail(res, 'Database connection timed out. Please retry.', 503);
  return fail(res, 'Server error.', 500);
}

// ─────────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────────

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body ?? {};

    if (!name?.trim())                          return fail(res, 'Full name is required.');
    if (name.trim().length < 2)                 return fail(res, 'Name must be at least 2 characters.');
    if (!isValidEmail(email))                   return fail(res, 'A valid email address is required.');
    if (!isValidPassword(password))             return fail(res, 'Password must be at least 6 characters.');
    if (!VALID_ROLES.includes(role) || role === 'admin')
      return fail(res, 'Role must be tenant or owner.');

    const normalEmail = email.trim().toLowerCase();
    const existing    = await queryOne('SELECT id FROM users WHERE email = ?', [normalEmail]);
    if (existing) return fail(res, 'An account with this email already exists.', 409);

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await query('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), normalEmail, hashed, role]);

    const user  = await queryOne('SELECT * FROM users WHERE email = ?', [normalEmail]);
    const token = signToken(user);
    setTokenCookie(res, token);
    return ok(res, { user: strip(user), token }, 'Account created successfully.', 201);
  } catch (err) {
    return handleDbError(res, err, 'POST /api/signup');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!isValidEmail(email)) return fail(res, 'A valid email address is required.');
    if (!password)            return fail(res, 'Password is required.');

    const normalEmail = email.trim().toLowerCase();
    const user        = await queryOne('SELECT * FROM users WHERE email = ?', [normalEmail]);

    // Timing-safe: always run bcrypt even on miss
    if (!user) {
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingprotection0000000000000');
      return fail(res, 'Invalid email or password.', 401);
    }
    if (user.status === 'suspended')
      return fail(res, 'Your account has been suspended. Contact support.', 403);

    const match = await bcrypt.compare(password, user.password);
    if (!match) return fail(res, 'Invalid email or password.', 401);

    const token = signToken(user);
    setTokenCookie(res, token);
    return ok(res, { user: strip(user), token }, 'Welcome back!');
  } catch (err) {
    return handleDbError(res, err, 'POST /api/login');
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('ff_token', { httpOnly: true, sameSite: IS_PROD ? 'none' : 'lax', secure: IS_PROD, path: '/' });
  return ok(res, null, 'Logged out successfully.');
});

app.get('/api/me', authenticate, async (req, res) => {
  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user)                       return fail(res, 'User not found.', 404);
    if (user.status === 'suspended') return fail(res, 'Account suspended.', 403);
    return ok(res, strip(user));
  } catch (err) {
    return handleDbError(res, err, 'GET /api/me');
  }
});

app.patch('/api/me', authenticate, async (req, res) => {
  try {
    const { name, email, password, phone, whatsapp, telegram, location, languages, bio } = req.body ?? {};

    if (name     !== undefined && !name?.trim())              return fail(res, 'Name cannot be empty.');
    if (name     !== undefined && name.trim().length < 2)     return fail(res, 'Name must be at least 2 characters.');
    if (email    !== undefined && !isValidEmail(email))       return fail(res, 'A valid email address is required.');
    if (password !== undefined && !isValidPassword(password)) return fail(res, 'Password must be at least 6 characters.');

    const current = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!current) return fail(res, 'User not found.', 404);

    if (email && email.trim().toLowerCase() !== current.email) {
      const taken = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?',
        [email.trim().toLowerCase(), req.user.id]);
      if (taken) return fail(res, 'That email is already in use by another account.', 409);
    }

    const updates = {
      name:      name?.trim()                      ?? current.name,
      email:     email?.trim().toLowerCase()        ?? current.email,
      phone:     phone     !== undefined ? phone     || null : current.phone,
      whatsapp:  whatsapp  !== undefined ? whatsapp  || null : current.whatsapp,
      telegram:  telegram  !== undefined ? telegram?.replace(/^@/, '') || null : current.telegram,
      location:  location  !== undefined ? location  || null : current.location,
      languages: languages !== undefined ? languages || null : current.languages,
      bio:       bio       !== undefined ? bio       || null : current.bio,
    };

    if (password) updates.password = await bcrypt.hash(password, SALT_ROUNDS);

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), req.user.id];
    await query(`UPDATE users SET ${fields}, updated_at = NOW() WHERE id = ?`, values);

    const updated = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return ok(res, strip(updated), 'Profile updated successfully.');
  } catch (err) {
    return handleDbError(res, err, 'PATCH /api/me');
  }
});

// ─────────────────────────────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────────────────────────────

app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let sql  = 'SELECT id, name, email, role, status, created_at FROM users WHERE 1=1';
    const args = [];

    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      sql += ' AND (name LIKE ? OR email LIKE ?)';
      args.push(s, s);
    }
    if (role   && VALID_ROLES.includes(role)) {
      sql += ' AND role = ?'; args.push(role);
    }
    if (status && VALID_STATUSES.user.includes(status)) {
      sql += ' AND status = ?'; args.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    return ok(res, await query(sql, args));
  } catch (err) {
    return handleDbError(res, err, 'GET /api/users');
  }
});

app.patch('/api/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body ?? {};

    if (!VALID_STATUSES.user.includes(status)) return fail(res, 'Status must be active or suspended.');
    if (String(id) === String(req.user.id))    return fail(res, 'You cannot change your own account status.');

    const target = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!target) return fail(res, 'User not found.', 404);

    await query('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    return ok(res, { id, status }, `User ${status === 'active' ? 'activated' : 'suspended'} successfully.`);
  } catch (err) {
    return handleDbError(res, err, 'PATCH /api/users/:id');
  }
});

app.delete('/api/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (String(id) === String(req.user.id)) return fail(res, 'You cannot delete your own account.');

    const target = await queryOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!target) return fail(res, 'User not found.', 404);

    await query('DELETE FROM users WHERE id = ?', [id]);
    return ok(res, { deleted: id }, 'User deleted successfully.');
  } catch (err) {
    return handleDbError(res, err, 'DELETE /api/users/:id');
  }
});

// ─────────────────────────────────────────────────────────────────
// FLAT ROUTES
// ─────────────────────────────────────────────────────────────────

app.get('/api/flats', authenticate, async (req, res) => {
  try {
    const { city, type, furnished, min_rent, max_rent, owner_id } = req.query;
    let sql  = 'SELECT f.*, u.name AS owner_name FROM flats f JOIN users u ON u.id = f.owner_id WHERE 1=1';
    const args = [];

    if (city?.trim()) { sql += ' AND f.city LIKE ?'; args.push(`%${city.trim()}%`); }
    if (type && VALID_TYPES.includes(type)) { sql += ' AND f.type = ?'; args.push(type); }
    if (furnished !== undefined && furnished !== '') {
      sql += ' AND f.furnished = ?';
      args.push(furnished === '1' || furnished === 'true' ? 1 : 0);
    }
    if (min_rent && !isNaN(min_rent)) { sql += ' AND f.rent >= ?'; args.push(parseFloat(min_rent)); }
    if (max_rent && !isNaN(max_rent)) { sql += ' AND f.rent <= ?'; args.push(parseFloat(max_rent)); }

    if (req.user.role === 'owner') {
      sql += ' AND f.owner_id = ?';
      args.push(owner_id || req.user.id);
    } else if (req.user.role === 'tenant') {
      sql += ` AND f.available = 1 AND EXISTS (
                 SELECT 1 FROM listings l WHERE l.flat_id = f.id AND l.status = 'approved'
               )`;
    }
    sql += ' ORDER BY f.created_at DESC';

    const rows = await query(sql, args);
    // Parse JSON columns; never expose image_public_ids to client
    const safe = rows.map(({ image_public_ids, ...f }) => {
      try { if (typeof f.amenities === 'string') f.amenities = JSON.parse(f.amenities); } catch { f.amenities = []; }
      try { if (typeof f.images    === 'string') f.images    = JSON.parse(f.images);    } catch { f.images    = []; }
      return f;
    });
    return ok(res, safe);
  } catch (err) {
    return handleDbError(res, err, 'GET /api/flats');
  }
});

app.get('/api/flats/:id', authenticate, async (req, res) => {
  try {
    const flat = await queryOne(
      `SELECT f.*,
              u.name     AS owner_name,
              u.phone    AS owner_phone,
              u.whatsapp AS owner_whatsapp,
              u.telegram AS owner_telegram,
              u.email    AS owner_email,
              u.bio      AS owner_bio
       FROM flats f
       JOIN users u ON u.id = f.owner_id
       WHERE f.id = ?`,
      [req.params.id],
    );
    if (!flat) return fail(res, 'Flat not found.', 404);

    try { if (typeof flat.amenities === 'string') flat.amenities = JSON.parse(flat.amenities); } catch { flat.amenities = []; }
    try { if (typeof flat.images    === 'string') flat.images    = JSON.parse(flat.images);    } catch { flat.images    = []; }
    delete flat.image_public_ids;
    return ok(res, flat);
  } catch (err) {
    return handleDbError(res, err, 'GET /api/flats/:id');
  }
});

app.post('/api/flats', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const {
      title, description, city, address, rent, type, furnished,
      amenities, images, image_public_ids,
      available_from, deposit, floor, total_floors, area_sqft,
      bathrooms, parking, facing, preferred_tenants, food_preference,
      pets_allowed, smoking_allowed, visitors_allowed, landmarks,
      contact_phone, contact_whatsapp, contact_email, contact_telegram,
      preferred_contact, best_time_to_call, owner_note,
    } = req.body ?? {};

    if (!title?.trim())              return fail(res, 'Title is required.');
    if (!city?.trim())               return fail(res, 'City is required.');
    if (!rent || isNaN(rent) || Number(rent) <= 0) return fail(res, 'A valid monthly rent is required.');
    if (!VALID_TYPES.includes(type)) return fail(res, `Flat type must be one of: ${VALID_TYPES.join(', ')}.`);

    // Validate that images array only contains HTTPS URLs (never raw base64)
    const imgUrls = Array.isArray(images) ? images : [];
    const imgIds  = Array.isArray(image_public_ids) ? image_public_ids : [];
    if (imgUrls.some(u => typeof u !== 'string' || u.length > 500)) {
      return fail(res, 'Invalid image data. Upload images via Cloudinary first.');
    }

    const ownerId = req.user.role === 'admin'
      ? (req.body.owner_id || req.user.id)
      : req.user.id;

    const parkingVal     = ['none','bike','car','both'].includes(parking) ? parking : 'none';
    const prefTenantsVal = ['any','family','bachelors','working_women','students'].includes(preferred_tenants) ? preferred_tenants : 'any';
    const foodPrefVal    = ['any','veg','nonveg'].includes(food_preference) ? food_preference : 'any';
    const prefContactVal = ['','phone','whatsapp','telegram','email'].includes(preferred_contact) ? preferred_contact || '' : '';

    await query(
      `INSERT INTO flats (
         owner_id, title, description, city, address, rent, type, furnished,
         amenities, images, image_public_ids,
         available_from, deposit, floor, total_floors, area_sqft,
         bathrooms, parking, facing, preferred_tenants, food_preference,
         pets_allowed, smoking_allowed, visitors_allowed, landmarks,
         contact_phone, contact_whatsapp, contact_email, contact_telegram,
         preferred_contact, best_time_to_call, owner_note
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        ownerId,
        title.trim(),
        description?.trim() || '',
        city.trim(),
        address?.trim() || '',
        parseFloat(rent),
        type,
        furnished == 1 || furnished === 'true' || furnished === true ? 1 : 0,
        JSON.stringify(Array.isArray(amenities) ? amenities : []),
        JSON.stringify(imgUrls),
        JSON.stringify(imgIds),
        available_from || null,
        deposit      ? parseFloat(deposit)       : null,
        floor        ? parseInt(floor, 10)       : null,
        total_floors ? parseInt(total_floors, 10): null,
        area_sqft    ? parseInt(area_sqft, 10)   : null,
        bathrooms    || null,
        parkingVal,
        facing       || null,
        prefTenantsVal,
        foodPrefVal,
        pets_allowed     ? 1 : 0,
        smoking_allowed  ? 1 : 0,
        visitors_allowed ? 1 : 0,
        landmarks?.trim()          || null,
        contact_phone?.trim()      || null,
        contact_whatsapp?.trim()   || null,
        contact_email?.trim()      || null,
        contact_telegram?.trim().replace(/^@/, '') || null,
        prefContactVal,
        best_time_to_call || null,
        owner_note?.trim()         || null,
      ],
    );

    const flat = await queryOne(
      'SELECT * FROM flats WHERE owner_id = ? ORDER BY created_at DESC LIMIT 1',
      [ownerId],
    );
    await query('INSERT INTO listings (flat_id, owner_id) VALUES (?, ?)', [flat.id, ownerId]);

    delete flat.image_public_ids;
    return ok(res, flat, 'Flat submitted for review. An admin will approve it shortly.', 201);
  } catch (err) {
    return handleDbError(res, err, 'POST /api/flats');
  }
});

app.delete('/api/flats/:id', authenticate, authorize('owner', 'admin'), async (req, res) => {
  try {
    const flat = await queryOne('SELECT * FROM flats WHERE id = ?', [req.params.id]);
    if (!flat) return fail(res, 'Flat not found.', 404);
    if (req.user.role === 'owner' && String(flat.owner_id) !== String(req.user.id))
      return fail(res, 'Forbidden — this is not your flat.', 403);

    // Attempt Cloudinary image cleanup (non-fatal)
    if (cloudinaryApi) {
      try {
        const rawIds = typeof flat.image_public_ids === 'string'
          ? JSON.parse(flat.image_public_ids)
          : Array.isArray(flat.image_public_ids) ? flat.image_public_ids : [];
        if (rawIds.length) {
          await cloudinaryApi.api.delete_resources(rawIds);
          console.log(`[server.js] Deleted ${rawIds.length} Cloudinary image(s) for flat ${req.params.id}`);
        }
      } catch (cdnErr) {
        console.warn('[server.js] Cloudinary deletion error (non-fatal):', cdnErr.message);
      }
    }

    await query('DELETE FROM flats WHERE id = ?', [req.params.id]);
    return ok(res, { deleted: req.params.id }, 'Flat deleted.');
  } catch (err) {
    return handleDbError(res, err, 'DELETE /api/flats/:id');
  }
});

// ─────────────────────────────────────────────────────────────────
// LISTING ROUTES
// ─────────────────────────────────────────────────────────────────

app.get('/api/listings', authenticate, authorize('admin', 'owner'), async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT l.*,
                 f.title  AS flat_title, f.city, f.rent, f.type, f.images,
                 u.name   AS owner_name,
                 r.name   AS reviewer_name
               FROM listings l
               JOIN flats f ON f.id = l.flat_id
               JOIN users  u ON u.id = l.owner_id
               LEFT JOIN users r ON r.id = l.reviewed_by
               WHERE 1=1`;
    const args = [];

    if (req.user.role === 'owner') { sql += ' AND l.owner_id = ?'; args.push(req.user.id); }
    if (status && ['pending', ...VALID_STATUSES.listing].includes(status)) {
      sql += ' AND l.status = ?'; args.push(status);
    }
    sql += ' ORDER BY l.submitted_at DESC';

    const rows = await query(sql, args);
    const safe = rows.map(l => {
      try { if (typeof l.images === 'string') l.images = JSON.parse(l.images); } catch { l.images = []; }
      return l;
    });
    return ok(res, safe);
  } catch (err) {
    return handleDbError(res, err, 'GET /api/listings');
  }
});

app.patch('/api/listings/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!VALID_STATUSES.listing.includes(status)) return fail(res, 'Status must be approved or rejected.');

    const listing = await queryOne('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    if (!listing) return fail(res, 'Listing not found.', 404);

    await query(
      'UPDATE listings SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?',
      [status, req.user.id, req.params.id],
    );
    await query('UPDATE flats SET available = ? WHERE id = ?',
      [status === 'approved' ? 1 : 0, listing.flat_id]);

    return ok(res, { id: req.params.id, status }, `Listing ${status} successfully.`);
  } catch (err) {
    return handleDbError(res, err, 'PATCH /api/listings/:id');
  }
});

// ─────────────────────────────────────────────────────────────────
// BOOKING ROUTES
// ─────────────────────────────────────────────────────────────────

app.get('/api/bookings', authenticate, async (req, res) => {
  try {
    let sql = `SELECT b.*,
                 f.title AS flat_title, f.city, f.type, f.rent,
                 t.name  AS tenant_name, t.email AS tenant_email,
                 o.name  AS owner_name
               FROM bookings b
               JOIN flats f ON f.id = b.flat_id
               JOIN users  t ON t.id = b.tenant_id
               JOIN users  o ON o.id = b.owner_id
               WHERE 1=1`;
    const args = [];

    if (req.user.role === 'tenant') { sql += ' AND b.tenant_id = ?'; args.push(req.user.id); }
    if (req.user.role === 'owner')  { sql += ' AND b.owner_id  = ?'; args.push(req.user.id); }
    sql += ' ORDER BY b.created_at DESC';

    return ok(res, await query(sql, args));
  } catch (err) {
    return handleDbError(res, err, 'GET /api/bookings');
  }
});

app.post('/api/bookings', authenticate, authorize('tenant'), async (req, res) => {
  try {
    const { flat_id, check_in, check_out } = req.body ?? {};

    if (!flat_id)   return fail(res, 'Flat ID is required.');
    if (!check_in)  return fail(res, 'Check-in date is required.');
    if (!check_out) return fail(res, 'Check-out date is required.');

    const checkInDate  = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const today        = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()))  return fail(res, 'Invalid check-in date.');
    if (isNaN(checkOutDate.getTime())) return fail(res, 'Invalid check-out date.');
    if (checkInDate < today)           return fail(res, 'Check-in date cannot be in the past.');
    if (checkOutDate <= checkInDate)   return fail(res, 'Check-out must be after check-in.');

    const flat = await queryOne(
      `SELECT f.* FROM flats f
       WHERE f.id = ? AND f.available = 1
         AND EXISTS (SELECT 1 FROM listings l WHERE l.flat_id = f.id AND l.status = 'approved')`,
      [flat_id],
    );
    if (!flat) return fail(res, 'Flat is not available for booking.');

    const overlap = await queryOne(
      `SELECT id FROM bookings
       WHERE flat_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`,
      [flat_id, check_out, check_in],
    );
    if (overlap) return fail(res, 'Flat is already booked for these dates.', 409);

    const days      = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalRent = parseFloat(((parseFloat(flat.rent) / 30) * days).toFixed(2));

    await query(
      'INSERT INTO bookings (flat_id, tenant_id, owner_id, check_in, check_out, total_rent) VALUES (?,?,?,?,?,?)',
      [flat_id, req.user.id, flat.owner_id, check_in, check_out, totalRent],
    );

    const booking = await queryOne(
      'SELECT * FROM bookings WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id],
    );
    return ok(res, booking, 'Booking submitted. Awaiting owner confirmation.', 201);
  } catch (err) {
    return handleDbError(res, err, 'POST /api/bookings');
  }
});

app.patch('/api/bookings/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body ?? {};
    if (!VALID_STATUSES.booking.includes(status)) return fail(res, 'Status must be confirmed or cancelled.');

    const booking = await queryOne('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!booking) return fail(res, 'Booking not found.', 404);

    const isOwner  = req.user.role === 'owner'  && String(booking.owner_id)  === String(req.user.id);
    const isTenant = req.user.role === 'tenant' && String(booking.tenant_id) === String(req.user.id);
    const isAdmin  = req.user.role === 'admin';

    if (!isOwner && !isTenant && !isAdmin) return fail(res, 'Forbidden.', 403);
    if (isTenant && status === 'confirmed') return fail(res, 'Tenants cannot confirm bookings.', 403);

    await query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    return ok(res, { id: req.params.id, status }, `Booking ${status}.`);
  } catch (err) {
    return handleDbError(res, err, 'PATCH /api/bookings/:id');
  }
});

// ── HEALTH CHECK ─────────────────────────────────────────────────
app.get('/api/ping', async (req, res) => {
  try {
    await query('SELECT 1');
    return res.json({ success: true, message: 'OK — MySQL connected.' });
  } catch (err) {
    return res.status(503).json({ success: false, message: 'MySQL not connected: ' + err.message });
  }
});

// ── BLOCK SENSITIVE SERVER-SIDE FILES FROM STATIC SERVING ────────
// Must come BEFORE express.static so source/config files are never downloadable.
const BLOCKED_STATIC = new Set([
  'server.js', 'db.js', 'schema.sql',
  'package.json', 'package-lock.json',
]);
app.use((req, res, next) => {
  const file = req.path.replace(/^\/+/, '');
  if (BLOCKED_STATIC.has(file))         return res.status(403).end();
  if (file.startsWith('node_modules/')) return res.status(403).end();
  if (file.startsWith('.'))             return res.status(403).end();
  next();
});

// ── STATIC FILES ─────────────────────────────────────────────────
// Mounted AFTER all API routes so API endpoints are never shadowed.
app.use(express.static(__dirname, {
  index: false, // '/' is handled manually above with meta injection
  dotfiles: 'deny',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  },
}));

// ── SPA FALLBACK ─────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/'))
    return fail(res, `Route ${req.method} ${req.path} not found.`, 404);
  // All non-API, non-file routes → inject and serve index.html (SPA)
  serveInjectedHtml('index.html', req, res);
});

// ── GLOBAL ERROR HANDLER ─────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err);
  if (err.message?.startsWith('CORS:')) return res.status(403).json({ success: false, data: null, message: err.message });
  return fail(res, IS_PROD ? 'Internal server error.' : err.message, 500);
});

// ── START ────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log(`║  🏠  FlatFinder API  —  port ${String(PORT).padEnd(5)}           ║`);
  console.log(`║  ENV: ${IS_PROD ? 'production ' : 'development'}                        ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`[server.js] Cloudinary cloud : ${CLOUD_NAME    || '❌ NOT SET'}`);
  console.log(`[server.js] Cloudinary preset: ${UPLOAD_PRESET || '❌ NOT SET'}`);
  await validateConnection();
  console.log('');
});

export default app;
