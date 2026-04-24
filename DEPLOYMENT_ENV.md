# Deployment Environment Checklist (Render + Railway + TiDB + Cloudinary)

Use this checklist to keep one codebase working safely across local, Render, and Railway.

## Required environment variables

- `NODE_ENV=production`
- `PORT` (platform usually injects this automatically)
- `JWT_SECRET` (strong random value; do not reuse across projects)
- `DB_HOST`
- `DB_PORT` (usually `4000` for TiDB Cloud)
- `DB_USER`
- `DB_PASSWORD`
- `DB_DATABASE` (or `DB_NAME`)

## Optional (recommended) variables

- `DATABASE_URL` (if provided, app will use it as DB source)
- `DB_SSL=true` (recommended for TiDB Cloud)
- `FRONTEND_URL` (primary frontend origin)
- `FRONTEND_URLS` (comma-separated additional origins)
- `RAILWAY_PUBLIC_DOMAIN` (auto-injected on Railway)
- `RENDER_EXTERNAL_URL` (auto-injected on Render)

## Cloudinary notes

This app currently serves Cloudinary values through server injection placeholders.
If you later move to env-based Cloudinary values, define:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_UPLOAD_PRESET`

## TiDB production notes

- Keep SSL enabled (`DB_SSL=true`) unless debugging local non-SSL MySQL.
- Ensure TiDB allowlist/network rules permit Render/Railway outbound access.
- Use a least-privilege DB user (avoid root for production).

## Quick verification steps

1. Start service with production envs configured.
2. Hit `/api/health` and confirm DB connectivity.
3. Test signup/login, listing fetch, owner create flow, admin approvals.
4. Verify CORS from all deployed frontend domains.
5. Confirm image upload path and Cloudinary URL rendering.
