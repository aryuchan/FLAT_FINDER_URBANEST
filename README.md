# Urbanest | FlatFinder Professional (v16.0)

A high-performance, secure, and visually stunning property management ecosystem. Built for professional tenants, property owners, and platform administrators.

## 🚀 Key Features

- **Multi-Role Portals**: Dedicated engines for Tenants (Search & Booking), Owners (Listing & Management), and Admins (Global Audit & Control).
- **Hardened Security**: 
  - Role-Based Access Control (RBAC) with JWT (Cookie + Header fallbacks).
  - SQL Overlap Guards to prevent double-bookings.
  - Zod-enforced input validation (Strict length & format guards).
  - Rate-limiting on sensitive Auth routes.
- **Premium UI Engine**: 
  - BEM-compliant styling system for 100% component consistency.
  - Glassmorphic design with a mobile-first responsive layout.
  - Centralized "Smart Toast" notification system.
- **Production Performance**: 
  - Service Worker (PWA) for offline resilience and asset caching.
  - Aggressive server-side cache invalidation logic.
  - ESM-native Node.js architecture.

## 🛠️ Technology Stack

- **Backend**: Node.js, Express, MySQL (TiDB/Railway compatible).
- **Security**: Bcrypt.js, JsonWebToken, Helmet, Zod.
- **Frontend**: Vanilla JavaScript (SPA), CSS3 (BEM), HTML5.
- **Deployment**: Render/Railway ready via `Procfile`.

## 📦 Installation & Setup

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Environment Variables**: Create a `.env` file with:
   ```env
   PORT=3000
   MYSQLHOST=your_db_host
   MYSQLUSER=your_db_user
   MYSQLPASSWORD=your_db_pass
   MYSQLDATABASE=your_db_name
   JWT_SECRET=your_super_secret_key
   ```

3. **Initialize Database**: Run the provided `schema.sql` in your MySQL terminal.

4. **Run**:
   ```bash
   npm start
   ```

## 📜 Deployment

The project is fully optimized for **Render** and **Railway**. Ensure you populate the environment variables in your cloud dashboard. The `sw.js` (Service Worker) will automatically handle asset versioning on every push.

---
**Maintained by Antigravity Senior Engineering.**
