# Urbanest — Full-Stack Property Rental Platform

Urbanest is a highly robust, dual-platform (Railway & Render) single-page application built for professional tenants and luxury property owners. Powered by a vanilla JS frontend and an Express/MySQL backend, it features a scalable architecture with strict role-based isolation, JWT authentication, and native PWA capabilities out of the box.

## Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), PWA Service Workers
- **Backend**: Node.js 18+, Express.js
- **Database**: MySQL 8.0 (mysql2)
- **Security**: JWT Auth, bcryptjs, Helmet, Express-Rate-Limit, Zod validation

## Local Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Copy environment variables: `cp .env.example .env` and fill them out.
4. Auto-migrate the database schema on server startup: The `utils/migrate.js` script handles `schema.sql` automatically.
5. Create your root admin user: `node utils/seed-admin.js`
6. Start the server: `npm run dev` (for watch mode) or `npm start`

## Deployment: Render (Free Tier)
1. Link your GitHub repository to Render as a Web Service.
2. Render will automatically detect the `render.yaml` infrastructure-as-code file.
3. Supply the required environment variables (`JWT_SECRET`, `DATABASE_URL`, `ALLOWED_ORIGINS`).
4. The application handles Render's load balancer cold-starts automatically via keep-alive timeouts.

## Deployment: Railway
1. Create a new Railway project and attach a MySQL Plugin database.
2. Link your GitHub repository.
3. Railway will inject `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, etc. The app will automatically fall back to these if `DATABASE_URL` is omitted.
4. Set your `JWT_SECRET` and other custom variables.
5. Once deployed, run `node utils/seed-admin.js` manually or via a cron job to provision the admin account.

## Environment Variable Reference
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Must be `production` for secure cookies and SSL enablement |
| `PORT` | Auto-assigned by host, defaults to `3000` |
| `JWT_SECRET` | Required. Minimum 32 characters for signing tokens |
| `DATABASE_URL` | Render/PlanetScale connection string (Priority 1) |
| `MYSQL*` | Railway individual connection credentials (Priority 2) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed domains for CORS |
| `DB_POOL_SIZE` | Database connection limit (Default: 5) |
| `ADMIN_EMAIL` | Target email for `seed-admin.js` |
| `ADMIN_PASSWORD` | Target password for `seed-admin.js` |

## Admin Provisioning
Self-registration for admins is disabled for security. Instead, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your environment and run the standalone seed script:
```bash
node utils/seed-admin.js
```
