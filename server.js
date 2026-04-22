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

import { query, queryOne, validateConnection } from "./db.js";
import { migrate } from "./utils/migrate.js";
import logger from "./utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Hardcoded Cloudinary Config (as requested for total stability)
const CLOUD_NAME = "dwgyilvip";
const UPLOAD_PRESET = "ffwpreset";

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
const SECRET = "FlatFinder_Industry_Secure_99_@Aryu"; // Hardcoded for stability
const IS_PROD = true; // Forcing production mode behaviors

const JWT_KEY = SECRET;

// ── SECURITY & MIDDLEWARE ──
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "img-src": ["'self'", "data:", "blob:"],
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      },
    },
  }),
);
app.use(
  cors({
    origin: [
      "https://flat-finder-urbanest.onrender.com",
      "https://urbanest.onrender.com",
      true,
    ],
    credentials: true,
  }),
);

app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

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
  async (req, res, next) => {
    const token =
      req.cookies.ff_token || req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      const decoded = jwt.verify(token, JWT_KEY);
      req.user = decoded;
      if (roles.length && !roles.includes(decoded.role))
        return res.status(403).json({ success: false, message: "Forbidden" });
      next();
    } catch (err) {
      res.status(401).json({ success: false, message: "Session expired" });
    }
  };

// ── API ROUTES ──

// Auth
app.post("/api/signup", authLimiter, async (req, res) => {
  try {
    const { name, email, password, role } = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        role: z.enum(["tenant", "owner"]),
      })
      .parse(req.body);

    const existing = await queryOne("SELECT id FROM users WHERE email = ?", [
      email.toLowerCase().trim(),
    ]);
    if (existing)
      return res.status(409).json({ success: false, message: "Email taken" });

    const hashed = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    await query(
      "INSERT INTO users (id, name, email, password, role) VALUES (?,?,?,?,?)",
      [id, name, email.toLowerCase().trim(), hashed, role],
    );
    res.json({ success: true, message: "Account created" });
  } catch (err) {
    res
      .status(400)
      .json({
        success: false,
        message: err.errors?.[0]?.message || "Invalid input",
      });
  }
});

app.post("/api/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await queryOne("SELECT * FROM users WHERE email = ?", [
      email.toLowerCase().trim(),
    ]);
    if (
      !user ||
      !(await bcrypt.compare(password, user.password)) ||
      user.status === "suspended"
    ) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
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
    res.json({
      success: true,
      data: { user: { id: user.id, name: user.name, role: user.role }, token },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("ff_token");
  res.json({ success: true });
});

app.get("/api/me", auth(), async (req, res) => {
  try {
    const user = await queryOne(
      "SELECT id, name, email, role, status, phone, bio FROM users WHERE id = ?",
      [req.user.id],
    );
    res.json({ success: true, data: user });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch profile" });
  }
});

app.patch("/api/me", auth(), async (req, res) => {
  try {
    const { name, password, phone, bio } = req.body;
    const updates = [];
    const params = [];

    if (name) {
      updates.push("name = ?");
      params.push(name);
    }
    if (phone) {
      updates.push("phone = ?");
      params.push(phone);
    }
    if (bio) {
      updates.push("bio = ?");
      params.push(bio);
    }
    if (password && password.length >= 8) {
      const hashed = await bcrypt.hash(password, 12);
      updates.push("password = ?");
      params.push(hashed);
    }

    if (updates.length === 0)
      return res
        .status(400)
        .json({ success: false, message: "No updates provided" });

    params.push(req.user.id);
    await query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    res.json({ success: true, message: "Profile updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// Flats
app.get("/api/flats", async (req, res) => {
  const { city, type, minRent, maxRent, ownerId, all } = req.query;
  let sql = "SELECT * FROM flats WHERE 1=1";
  const params = [];

  if (ownerId) {
    sql += " AND owner_id = ?";
    params.push(ownerId);
  } else if (all !== "1") {
    sql += " AND available = 1";
  }

  if (city) {
    sql += " AND city LIKE ?";
    params.push(`%${city}%`);
  }
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (minRent) {
    sql += " AND rent >= ?";
    params.push(minRent);
  }
  if (maxRent) {
    sql += " AND rent <= ?";
    params.push(maxRent);
  }

  sql += " ORDER BY created_at DESC";
  const flats = await query(sql, params);
  res.json({ success: true, data: flats });
});

app.get("/api/flats/:id", async (req, res) => {
  try {
    const flat = await queryOne(
      "SELECT f.*, u.name as owner_name, u.phone as owner_phone, u.email as owner_email, u.bio as owner_bio FROM flats f JOIN users u ON f.owner_id = u.id WHERE f.id = ?",
      [req.params.id],
    );
    if (!flat)
      return res.status(404).json({ success: false, message: "Flat not found" });
    res.json({ success: true, data: flat });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/flats", auth(["owner"]), async (req, res) => {
  try {
    const {
      title,
      city,
      type,
      rent,
      address,
      description,
      deposit,
      floor,
      total_floors,
      area_sqft,
      parking,
      preferred_tenants,
      food_preference,
      images,
      amenities,
    } = req.body;

    const id = crypto.randomUUID();
    await query(
      `
      INSERT INTO flats (
        id, owner_id, title, city, type, rent, address, description, 
        deposit, floor, total_floors, area_sqft, 
        parking, preferred_tenants, food_preference,
        images, amenities
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        req.user.id,
        title,
        city,
        type,
        rent,
        address || "",
        description || "",
        deposit || 0,
        floor || 0,
        total_floors || 0,
        area_sqft || 0,
        parking || "none",
        preferred_tenants || "any",
        food_preference || "any",
        JSON.stringify(images || []),
        JSON.stringify(amenities || []),
      ],
    );
    res.json({ success: true, data: { id } });
  } catch (err) {
    logger.error("Flat creation failed:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Failed to create listing" });
  }
});

app.post(
  "/api/flats/:id/image",
  auth(["owner"]),
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ success: false, message: "No image" });
      const imageUrl = `/uploads/${req.file.filename}`;

      // Fetch current images
      const flat = await queryOne(
        "SELECT images FROM flats WHERE id = ? AND owner_id = ?",
        [req.params.id, req.user.id],
      );
      if (!flat)
        return res
          .status(404)
          .json({ success: false, message: "Flat not found" });

      let images = [];
      try {
        images = JSON.parse(flat.images || "[]");
      } catch (e) {
        images = [];
      }

      images.push(imageUrl);

      await query("UPDATE flats SET images = ? WHERE id = ? AND owner_id = ?", [
        JSON.stringify(images),
        req.params.id,
        req.user.id,
      ]);
      res.json({ success: true, data: { image_url: imageUrl, images } });
    } catch (err) {
      logger.error(`[IMAGE_UPLOAD_FAIL] ${err.message}`);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  },
);

app.patch("/api/flats/:id", auth(["owner", "admin"]), async (req, res) => {
  const { available } = req.body;
  await query("UPDATE flats SET available = ? WHERE id = ?", [
    available ? 1 : 0,
    req.params.id,
  ]);
  res.json({ success: true });
});

app.delete("/api/flats/:id", auth(["admin"]), async (req, res) => {
  await query("DELETE FROM flats WHERE id = ?", [req.params.id]);
  res.json({ success: true });
});

// Bookings
app.get("/api/bookings", auth(["tenant", "owner"]), async (req, res) => {
  let sql =
    "SELECT b.*, f.title as flat_title, u.name as tenant_name FROM bookings b JOIN flats f ON b.flat_id = f.id JOIN users u ON b.tenant_id = u.id";
  let params = [];
  if (req.user.role === "tenant") {
    sql += " WHERE b.tenant_id = ?";
    params.push(req.user.id);
  } else {
    sql += " WHERE f.owner_id = ?";
    params.push(req.user.id);
  }
  const rows = await query(sql, params);
  res.json({ success: true, data: rows });
});

app.post("/api/bookings", auth(["tenant"]), async (req, res) => {
  const { flat_id, check_in, check_out } = req.body;
  const id = crypto.randomUUID();
  await query(
    "INSERT INTO bookings (id, flat_id, tenant_id, check_in, check_out) VALUES (?,?,?,?,?)",
    [id, flat_id, req.user.id, check_in, check_out],
  );
  res.json({ success: true });
});

app.patch("/api/bookings/:id", auth(["owner", "tenant"]), async (req, res) => {
  const { status } = req.body;
  await query("UPDATE bookings SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.json({ success: true });
});

// Admin: Users
app.get("/api/users", auth(["admin"]), async (req, res) => {
  const rows = await query("SELECT id, name, email, role, status FROM users");
  res.json({ success: true, data: rows });
});

app.patch("/api/users/:id", auth(["admin"]), async (req, res) => {
  const { status } = req.body;
  await query("UPDATE users SET status = ? WHERE id = ?", [
    status,
    req.params.id,
  ]);
  res.json({ success: true });
});

// ── STARTUP ──
(async () => {
  const connected = await validateConnection();

  if (connected) {
    try {
      await migrate();
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
