// server.js — Production Hardened Engine (v19.2)
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { z } from "zod";

import { query, queryOne, validateConnection, pool } from "./db.js";
import { migrate } from "./utils/migrate.js";
import logger from "./utils/logger.js";
import { 
  asyncHandler, 
  errorHandler, 
  AppError, 
  AuthError, 
  ForbiddenError, 
  ValidationError, 
  NotFoundError 
} from "./utils/errors.js";
import { responseHandler } from "./utils/api-response.js";
import { Cache } from "./utils/performance.js";
import { Transaction } from "./utils/db-helpers.js";

const listingCache = new Cache(300000); // 5 minute cache

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Disabled for simplicity in dev/demo
}));
app.use(compression());

// Cloudinary config is env-driven for deployment portability, with safe fallback.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "dwgyilvip";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "ffwpreset";

async function serveInjectedHtml(file, req, res) {
  const filePath = path.join(__dirname, file);
  try {
    const data = await fs.readFile(filePath, "utf8");
    const injected = data
      .replace(/{{CLOUDINARY_CLOUD_NAME}}/g, CLOUD_NAME)
      .replace(/{{CLOUDINARY_UPLOAD_PRESET}}/g, UPLOAD_PRESET);
    res.setHeader("Content-Type", "text/html");
    res.send(injected);
  } catch (err) {
    logger.error(`[FS_ERROR] Failed to serve ${file}: ${err.message}`);
    res.status(404).send("Page not found");
  }
}

app.get("/", (req, res) => serveInjectedHtml("index.html", req, res));
app.get("/tenant", (req, res) =>
  serveInjectedHtml("tenant_index.html", req, res),
);
app.get("/owner", (req, res) =>
  serveInjectedHtml("owner_index.html", req, res),
);
app.get("/admin", (req, res) =>
  serveInjectedHtml("admin_index.html", req, res),
);

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "FlatFinder_Industry_Secure_99_@Aryu";
const IS_PROD = process.env.NODE_ENV === "production";

const JWT_KEY = SECRET;

// ── SECURITY & MIDDLEWARE ──
app.set("trust proxy", 1);
app.use(
  cors({
    origin: (origin, callback) => {
      const csvOrigins = (process.env.FRONTEND_URLS || "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
        process.env.RENDER_EXTERNAL_URL,
        "https://flat-finder-urbanest.onrender.com",
        "https://urbanest.onrender.com",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        ...csvOrigins,
      ].filter(Boolean);
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
await fs
  .mkdir(path.join(__dirname, "uploads"), { recursive: true })
  .catch((err) => {
    logger.warn(
      `[UPLOAD_DIR] Could not create uploads directory: ${err.message}`,
    );
  });

app.use(cookieParser());
app.use(responseHandler);

// Block direct access to server-side files and configuration
app.use((req, res, next) => {
  const forbidden = [
    "/server.js",
    "/db.js",
    "/package.json",
    "/package-lock.json",
    "/render.yaml",
    "/Procfile",
    "/.env",
  ];
  if (
    forbidden.includes(req.path) ||
    req.path.startsWith("/utils") ||
    req.path.startsWith("/node_modules") ||
    req.path.startsWith("/.git")
  ) {
    return res.status(404).end();
  }
  next();
});

// Serve Static Assets
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts" },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests" },
});

app.use("/api", apiLimiter);

// ── FILE UPLOAD CONFIG ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(
      null,
      `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${path.extname(file.originalname)}`,
    ),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

// ── AUTH LOGIC ──
const auth =
  (roles = []) =>
  asyncHandler(async (req, res, next) => {
    const token =
      req.cookies.ff_token || req.headers.authorization?.split(" ")[1];
    if (!token) throw new AuthError("Authentication required");
    
    try {
      const decoded = jwt.verify(token, JWT_KEY);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role)) {
        throw new ForbiddenError("Insufficient permissions");
      }
      next();
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AuthError("Session expired or invalid");
    }
  });

// ── API ROUTES ──

app.get("/api/health", asyncHandler(async (req, res) => {
  await query("SELECT 1");
  res.success(
    {
      status: "ok",
      env: process.env.NODE_ENV || "development",
      uptime_s: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    "Service healthy",
  );
}));

// Auth
app.post("/api/signup", authLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, role } = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["tenant", "owner", "admin"]),
    })
    .parse(req.body);

  const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
    email.toLowerCase().trim(),
  ]);
  if (existing) throw new AppError("Email already registered", 409);

  const hashed = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  await query(
    "INSERT INTO users (id, name, email, password, role) VALUES (?,?,?,?,?)",
    [id, name, email.toLowerCase().trim(), hashed, role],
  );

  const token = jwt.sign({ id, name, role }, JWT_KEY, { expiresIn: "7d" });
  res.cookie("ff_token", token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    maxAge: 7 * 86400000,
  });

  res.success({ user: { id, name, role }, token }, "Account created and logged in!", 201);
}));

app.post("/api/login", authLimiter, asyncHandler(async (req, res) => {
  const { email, password } = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .parse(req.body);

  const user = await queryOne("SELECT * FROM users WHERE email = ?", [
    email.toLowerCase().trim(),
  ]);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AuthError("Invalid credentials");
  }

  if (user.status === "suspended") {
    throw new ForbiddenError("Your account has been suspended");
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    JWT_KEY,
    { expiresIn: "7d" },
  );

  res.cookie("ff_token", token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "strict",
    maxAge: 7 * 86400000,
  });

  res.success({ user: { id: user.id, name: user.name, role: user.role }, token });
}));

app.post("/api/logout", (req, res) => {
  res.clearCookie("ff_token");
  res.success(null, "Logged out successfully");
});

app.get("/api/me", auth(), asyncHandler(async (req, res) => {
  const user = await queryOne(
    "SELECT id, name, email, role, status, phone, whatsapp, telegram, bio, location, languages FROM users WHERE id = ?",
    [req.user.id],
  );
  if (!user) throw new NotFoundError("User");
  res.success(user);
}));

app.patch("/api/me", auth(), asyncHandler(async (req, res) => {
  const {
    name,
    password,
    phone,
    whatsapp,
    telegram,
    bio,
    location,
    languages,
  } = req.body;
  const updates = [];
  const params = [];

  if (name) { updates.push("name = ?"); params.push(name); }
  if (phone !== undefined) { updates.push("phone = ?"); params.push(phone || ""); }
  if (whatsapp !== undefined) { updates.push("whatsapp = ?"); params.push(whatsapp || ""); }
  if (telegram !== undefined) { updates.push("telegram = ?"); params.push(telegram || ""); }
  if (bio !== undefined) { updates.push("bio = ?"); params.push(bio || ""); }
  if (location !== undefined) { updates.push("location = ?"); params.push(location || ""); }
  if (languages !== undefined) { updates.push("languages = ?"); params.push(languages || ""); }
  
  if (password && password.length >= 6) {
    const hashed = await bcrypt.hash(password, 12);
    updates.push("password = ?");
    params.push(hashed);
  }

  if (updates.length === 0) throw new AppError("No updates provided", 400);

  params.push(req.user.id);
  await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  
  const user = await queryOne(
    "SELECT id, name, email, role, status, phone, whatsapp, telegram, bio, location, languages FROM users WHERE id = ?",
    [req.user.id],
  );
  res.success(user, "Profile updated");
}));

// Flats
app.get("/api/flats", asyncHandler(async (req, res) => {
  const {
    city,
    type,
    min_rent: minRent,
    max_rent: maxRent,
    owner_id: ownerId,
    all,
  } = req.query;

  // Check cache
  const cacheKey = JSON.stringify(req.query);
  const cached = listingCache.get(cacheKey);
  if (cached) return res.success(cached);

  let sql =
    "SELECT f.*, u.name as owner_name FROM flats f JOIN users u ON f.owner_id = u.id WHERE 1=1";
  const params = [];

  if (ownerId) {
    sql += " AND f.owner_id = ?";
    params.push(ownerId);
  } else if (all !== "1") {
    sql += " AND f.available = 1";
  }

  if (city) {
    sql += " AND f.city LIKE ?";
    params.push(`%${city}%`);
  }
  if (type) {
    sql += " AND f.type = ?";
    params.push(type);
  }
  if (minRent) {
    sql += " AND f.rent >= ?";
    params.push(minRent);
  }
  if (maxRent) {
    sql += " AND f.rent <= ?";
    params.push(maxRent);
  }
  if (req.query.furnished !== undefined && req.query.furnished !== "") {
    sql += " AND f.furnished = ?";
    params.push(parseInt(req.query.furnished, 10));
  }

    sql += " ORDER BY f.created_at DESC LIMIT 100";
    const flats = await query(sql, params);

    const parsed = flats.map((f) => {
      let images = [];
      let amenities = [];
      try { images = JSON.parse(f.images || "[]"); } catch (e) {}
      try { amenities = JSON.parse(f.amenities || "[]"); } catch (e) {}
      return { ...f, images, amenities };
    });

    listingCache.set(cacheKey, parsed);
    res.success(parsed);
}));

// User Management (Admin)
app.get("/api/users", auth(["admin"]), asyncHandler(async (req, res) => {
  const users = await query(
    "SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC",
  );
  res.success(users);
}));

app.patch("/api/users/:id", auth(["admin"]), asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!["active", "suspended"].includes(status)) {
    throw new ValidationError("Invalid status");
  }
  await query("UPDATE users SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.success(null, `User status updated to ${status}`);
}));

app.delete("/api/users/:id", auth(["admin"]), asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw new AppError("You cannot delete your own admin account", 400);
  }

  const transaction = new Transaction(pool);
  try {
    await transaction.begin();

    // Cascading deletion handled via transactions for extra safety
    await transaction.query("DELETE FROM bookings WHERE tenant_id = ?", [req.params.id]);
    
    const flats = await transaction.query("SELECT id FROM flats WHERE owner_id = ?", [req.params.id]);
    const flatIds = flats.map(f => f.id);
    
    if (flatIds.length > 0) {
      await transaction.query(`DELETE FROM bookings WHERE flat_id IN (${flatIds.map(() => "?").join(",")})`, flatIds);
      await transaction.query(`DELETE FROM listings WHERE flat_id IN (${flatIds.map(() => "?").join(",")})`, flatIds);
      await transaction.query("DELETE FROM flats WHERE owner_id = ?", [req.params.id]);
    }
    
    await transaction.query("DELETE FROM users WHERE id = ?", [req.params.id]);
    
    await transaction.commit();
    listingCache.clear();
    res.success(null, "User and all associated data permanently deleted");
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}));

app.get("/api/flats/:id", asyncHandler(async (req, res) => {
  const flat = await queryOne(
    `SELECT f.*, 
            u.name as owner_name, u.phone as owner_phone, u.email as owner_email, u.bio as owner_bio,
            u.whatsapp as owner_whatsapp, u.telegram as owner_telegram, 
            u.location as owner_location, u.languages as owner_languages
     FROM flats f 
     JOIN users u ON f.owner_id = u.id 
     WHERE f.id = ?`,
    [req.params.id],
  );
  if (!flat) throw new NotFoundError("Flat");

  // Safe Parse JSON fields
  try { flat.images = JSON.parse(flat.images || "[]"); } catch (e) { flat.images = []; }
  try { flat.amenities = JSON.parse(flat.amenities || "[]"); } catch (e) { flat.amenities = []; }

  res.success(flat);
}));

app.post("/api/flats", auth(["owner", "admin"]), asyncHandler(async (req, res) => {
  const {
    title, city, type, rent, address, description, deposit,
    floor, total_floors, area_sqft, parking,
    preferred_tenants, food_preference, furnished,
    bathrooms, facing, landmarks,
    pets_allowed, smoking_allowed, visitors_allowed,
    images, amenities,
  } = req.body;

  if (!title || !city || !rent || !type) {
    throw new ValidationError("Missing required fields");
  }

  const flatId = crypto.randomUUID();
  const listingId = crypto.randomUUID();
  const finalOwnerId = (req.user.role === "admin" && req.body.owner_id) ? req.body.owner_id : req.user.id;

  await query(
    `INSERT INTO flats (
      id, owner_id, title, city, type, rent, address, description, 
      deposit, floor, total_floors, area_sqft, 
      parking, preferred_tenants, food_preference, furnished,
      bathrooms, facing, landmarks, pets_allowed, smoking_allowed, visitors_allowed,
      images, amenities, available
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)`,
    [
      flatId, finalOwnerId, title, city, type, parseFloat(rent) || 0,
      address || "", description || "", parseFloat(deposit) || 0,
      parseInt(floor ?? req.body.floor_number) || 0, parseInt(total_floors) || 0,
      parseInt(area_sqft) || 0, parking || "none",
      preferred_tenants || "any", food_preference || "any", parseInt(furnished) || 0,
      bathrooms || "", facing || "", landmarks || "",
      parseInt(pets_allowed) || 0, parseInt(smoking_allowed) || 0, parseInt(visitors_allowed) || 0,
      JSON.stringify(images || []), JSON.stringify(amenities || []),
    ],
  );

  await query(
    "INSERT INTO listings (id, flat_id, owner_id, status) VALUES (?,?,?,?)",
    [listingId, flatId, finalOwnerId, "pending"],
  );

  listingCache.clear();
  res.success({ id: flatId }, "Flat submitted for review.", 201);
}));

// Admin/Owner Listings
app.get("/api/listings", auth(["owner", "admin"]), asyncHandler(async (req, res) => {
  const { status } = req.query;
  let sql = `
    SELECT l.*, f.title AS flat_title, f.city, f.rent, f.type, f.available, u.name AS owner_name, r.name AS reviewer_name
    FROM listings l
    JOIN flats f ON l.flat_id = f.id
    JOIN users u ON l.owner_id = u.id
    LEFT JOIN users r ON l.reviewed_by = r.id
    WHERE 1=1`;
  let params = [];
  if (req.user.role === "owner") {
    sql += " AND l.owner_id = ?";
    params.push(req.user.id);
  }
  if (status) {
    sql += " AND l.status = ?";
    params.push(status);
  }
  sql += " ORDER BY l.submitted_at DESC LIMIT 100";
  const rows = await query(sql, params);
  res.success(rows);
}));

app.patch("/api/listings/:id", auth(["admin"]), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const transaction = new Transaction(pool);
  
  try {
    await transaction.begin();
    
    const listing = await transaction.queryOne("SELECT * FROM listings WHERE id = ?", [req.params.id]);
    if (!listing) throw new NotFoundError("Listing");

    await transaction.query(
      "UPDATE listings SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?",
      [status, req.user.id, req.params.id],
    );

    await transaction.query("UPDATE flats SET available = ? WHERE id = ?", [
      status === "approved" ? 1 : 0,
      listing.flat_id,
    ]);

    await transaction.commit();
    
    listingCache.clear();
    res.success(null, `Listing ${status}`);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}));

app.post("/api/flats/:id/image", auth(["owner"]), upload.single("image"), asyncHandler(async (req, res) => {
  if (!req.file) throw new ValidationError("No image provided");
  const imageUrl = `/uploads/${req.file.filename}`;

  const flat = await queryOne(
    "SELECT images FROM flats WHERE id = ? AND owner_id = ?",
    [req.params.id, req.user.id],
  );
  if (!flat) throw new NotFoundError("Flat");

  let images = [];
  try { images = JSON.parse(flat.images || "[]"); } catch (e) { images = []; }
  images.push(imageUrl);

  await query("UPDATE flats SET images = ? WHERE id = ? AND owner_id = ?", [
    JSON.stringify(images),
    req.params.id,
    req.user.id,
  ]);
  
  listingCache.clear();
  res.success({ image_url: imageUrl, images }, "Image uploaded");
}));

app.post("/api/flats/:id/toggle", auth(["owner", "admin"]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [flat] = await query("SELECT available, owner_id FROM flats WHERE id = ?", [id]);
  if (!flat) throw new NotFoundError("Flat");

  if (req.user.role !== "admin" && flat.owner_id !== req.user.id) {
    throw new ForbiddenError();
  }

  const nextState = flat.available === 1 ? 0 : 1;
  await query("UPDATE flats SET available = ? WHERE id = ?", [nextState, id]);
  
  listingCache.clear();
  res.success(null, `Flat is now ${nextState === 1 ? "visible" : "hidden"}`);
}));

app.delete("/api/flats/:id", auth(["owner", "admin"]), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [flat] = await query("SELECT owner_id FROM flats WHERE id = ?", [id]);
  if (!flat) throw new NotFoundError("Flat");

  if (req.user.role !== "admin" && flat.owner_id !== req.user.id) {
    throw new ForbiddenError();
  }

  await query("DELETE FROM flats WHERE id = ?", [id]);
  listingCache.clear();
  res.success(null, "Listing deleted successfully");
}));

app.get("/api/bookings", auth(["tenant", "owner"]), asyncHandler(async (req, res) => {
  let sql = `
    SELECT b.*, f.title as flat_title, f.city, u.name as tenant_name 
    FROM bookings b 
    JOIN flats f ON b.flat_id = f.id 
    JOIN users u ON b.tenant_id = u.id`;
  let params = [];
  if (req.user.role === "tenant") {
    sql += " WHERE b.tenant_id = ?";
    params.push(req.user.id);
  } else {
    sql += " WHERE f.owner_id = ?";
    params.push(req.user.id);
  }
  const rows = await query(sql, params);
  res.success(rows);
}));

app.post("/api/bookings", auth(["tenant"]), asyncHandler(async (req, res) => {
  const { flat_id, check_in, check_out } = z
    .object({
      flat_id: z.string().min(1),
      check_in: z.string().min(1),
      check_out: z.string().min(1),
    })
    .parse(req.body);

  const flat = await queryOne("SELECT rent, available FROM flats WHERE id = ?", [flat_id]);
  if (!flat) throw new NotFoundError("Flat");
  if (!flat.available) throw new AppError("Flat is not available", 400);

  const days = Math.ceil((new Date(check_out) - new Date(check_in)) / 86400000);
  if (!Number.isFinite(days) || days <= 0) {
    throw new ValidationError("Check-out must be after check-in");
  }

  // Reject past dates (server-side guard)
  const today = new Date().toISOString().split("T")[0];
  if (check_in < today) {
    throw new ValidationError("Check-in date cannot be in the past");
  }
  
  const total_rent = ((parseFloat(flat.rent) / 30) * (days > 0 ? days : 1)).toFixed(2);
  const id = crypto.randomUUID();
  await query(
    "INSERT INTO bookings (id, flat_id, tenant_id, check_in, check_out, total_rent) VALUES (?,?,?,?,?,?)",
    [id, flat_id, req.user.id, check_in, check_out, total_rent],
  );
  res.success(null, "Booking created successfully", 201);
}));

app.patch("/api/bookings/:id", auth(["owner", "tenant"]), asyncHandler(async (req, res) => {
  const { status } = z
    .object({
      status: z.enum(["confirmed", "cancelled"]),
    })
    .parse(req.body);

  const booking = await queryOne(
    `SELECT b.id, b.status, b.tenant_id, f.owner_id
     FROM bookings b
     JOIN flats f ON b.flat_id = f.id
     WHERE b.id = ?`,
    [req.params.id],
  );
  if (!booking) throw new NotFoundError("Booking");

  if (req.user.role === "tenant") {
    if (booking.tenant_id !== req.user.id) throw new ForbiddenError();
    if (status !== "cancelled") {
      throw new ForbiddenError("Tenants can only cancel bookings");
    }
  }

  if (req.user.role === "owner" && booking.owner_id !== req.user.id) {
    throw new ForbiddenError();
  }

  if (booking.status !== "pending") {
    throw new AppError("Only pending bookings can be updated", 400);
  }

  await query("UPDATE bookings SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.success(null, `Booking ${status}`);
}));

// ── STARTUP ──
(async () => {
  const connected = await validateConnection();

  if (connected) {
    try {
      await migrate();

      // Ensure Default Admin for verification
      const adminEmail = "admin@flatfinder.com";
      const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
        adminEmail,
      ]);
      if (!existing) {
        const id = crypto.randomUUID();
        const hashed = await bcrypt.hash("admin123", 12);
        await query(
          "INSERT INTO users (id, name, email, password, role, status) VALUES (?,?,?,?,?,?)",
          [id, "System Admin", adminEmail, hashed, "admin", "active"],
        );
        logger.info(`[SEED] Created default admin: ${adminEmail}`);
      }

      app.listen(PORT, () =>
        logger.info(`Urbanest Engine v19.2 Online @ Port ${PORT}`),
      );
    } catch (err) {
      logger.error(`Startup migration failed: ${err.message}`);
      process.exit(1);
    }
  } else {
    logger.error(
      "[CRITICAL] Database unreachable. Terminating process to expose failure.",
    );
    process.exit(1);
  }
})();

// Global Error Handler (MUST BE LAST)
app.use(errorHandler);
