# Opportunity OS — Public SaaS Deployment & Operations Guide

This guide details the deployment architecture, configuration, security model, and operational procedures for running Opportunity OS in production as a public multi-tenant SaaS.

---

## 1. Architecture Overview (Split Hosting)

Opportunity OS utilizes a decoupled split-hosting architecture:

```
┌─────────────────────────────────┐         HTTPS / JSON API         ┌──────────────────────────────────────┐
│        Vercel (Frontend)        │ ───────────────────────────────> │    Persistent Node.js Backend Host   │
│  - React 18 + Vite SPA          │ <─────────────────────────────── │  (Railway / Render / Fly.io / VPS)   │
│  - Static Asset CDN             │   Authorization: Bearer <JWT>    │  - Express REST API                  │
│  - vercel.json SPA rewrites     │                                  │  - SQLite on Persistent Volume       │
└─────────────────────────────────┘                                  │  - AI Router & Discovery Engines     │
                                                                     └──────────────────────────────────────┘
```

1. **Frontend (Vercel)**:
   - Pure client-side React 18 single-page application compiled to `dist/`.
   - Communicates with the backend using the configurable `VITE_API_URL` environment variable.
   - Automatically attaches stored JWT Bearer tokens to API calls via the reactive `authFetch` client.

2. **Backend (Persistent Node.js)**:
   - Express REST API running on Node.js (via `npm start` or Docker).
   - Embedded SQLite database stored on a persistent volume (`DB_PATH`).
   - Handles multi-tenant authentication, password hashing (`scrypt`), JWT issuance/verification, and strict tenant-scoped data isolation.

---

## 2. Multi-Tenant Security & Data Isolation Model

Every authenticated request is checked by the `requireAuth` middleware before reaching route handlers:

- **Identity Verification**: The client must provide a valid `Authorization: Bearer <token>` header. Browser-supplied user IDs in headers or query strings are never trusted.
- **Data Scoping**: Every database query filters by `user_id = req.user.userId`.
  - 15 user-scoped tables: `profiles`, `skills`, `tools`, `goals`, `interests`, `projects`, `opportunities`, `tool_combinations`, `action_plans`, `action_steps`, `progress_logs`, `feedback`, `learning_signals`, `learning_profile`, `scan_records`.
- **Zero Cross-Tenant Leakage**:
  - Direct ID queries (`/api/action-plans/:id`) verify user ownership and return `404` for unauthorized attempts.
  - Progress metrics, logs, and personal learning preferences are computed strictly within tenant boundaries.
- **Legacy Account Preservation**:
  - Existing single-tenant records are safely preserved under `user-default-legacy` (`owner@opportunityos.local`), protected by scrypt password hashing.
  - In production, if `INITIAL_OWNER_PASSWORD` is omitted, an unguessable 48-character randomized hex password is generated.
  - No legacy user data is ever leaked or inherited by new signups.

---

## 3. Frontend Deployment (Vercel)

### Step 1: Import Repository
1. Log in to [Vercel](https://vercel.com) and click **Add New...** → **Project**.
2. Select your Opportunity OS repository.

### Step 2: Configure Build & Output
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Set Environment Variables
In **Project Settings → Environment Variables**, add:
- `VITE_API_URL`: The public URL of your persistent backend (e.g. `https://api.opportunityos.com`).

*(Note: Never set `JWT_SECRET`, database paths, or provider API keys in Vercel. Frontend variables must only contain `VITE_*` public variables.)*

### Step 4: Deploy
Click **Deploy**. `vercel.json` will automatically configure SPA rewrite rules so client-side navigation (`/profile`, `/combiner`, etc.) works without 404 errors.

---

## 4. Backend Deployment (Persistent Node.js Host)

SQLite requires a persistent disk volume to ensure user accounts, opportunities, and progress logs are not lost on container restarts or redeploys.

### Option A: Railway (Recommended)
1. In Railway, click **New Project** → **Deploy from GitHub repo**.
2. Add a **Persistent Volume**:
   - Volume Mount Path: `/data`
3. In **Variables**, configure:
   ```env
   PORT=3001
   NODE_ENV=production
   DB_PATH=/data/opportunity_engine.db
   CORS_ORIGIN=https://your-app.vercel.app
   APP_URL=https://your-app.vercel.app
   JWT_SECRET=generate_a_cryptographically_secure_random_string_min_32_chars
   INITIAL_OWNER_EMAIL=owner@opportunityos.local
   INITIAL_OWNER_PASSWORD=generate_strong_owner_password
   # Transactional Email (Resend, SendGrid, or Postmark)
   RESEND_API_KEY=re_your_api_key
   EMAIL_FROM=Opportunity OS <noreply@yourdomain.com>
   ```
4. Start Command: `npm start`
5. Railway provides an HTTPS domain (e.g. `https://opportunity-os-production.up.railway.app`). Set this as `VITE_API_URL` on Vercel.

### Option B: Render
1. Create a **Web Service** on Render.
2. Under **Disks**, attach a persistent disk mounted at `/var/data` (e.g. 5GB).
3. Set `DB_PATH=/var/data/opportunity_engine.db`.
4. Add environment variables matching `.env.example`.
5. Set `CORS_ORIGIN=https://your-app.vercel.app`.

### Option C: Fly.io
1. Create a volume: `fly volumes create opp_data --size 5`
2. In `fly.toml`, mount volume:
   ```toml
   [mounts]
     source = "opp_data"
     destination = "/data"
   ```
3. Set environment variable `DB_PATH=/data/opportunity_engine.db`.

---

## 5. Database Persistence, Backups & Restoration

Opportunity OS includes an automated SQLite utility using SQLite's atomic online `VACUUM INTO` command, which creates hot snapshots without blocking reads/writes or risking file corruption:

### Create an Atomic Backup
```bash
node scripts/backup-db.js backup
```
Snapshots are timestamped and saved in `data/backups/`.

### List Existing Backups
```bash
node scripts/backup-db.js list
```

### Restore from Backup
```bash
node scripts/backup-db.js restore data/backups/opportunity_engine_backup_<timestamp>.db
```
*(The utility automatically creates a pre-restore safety copy of the current database before replacing it.)*

### Scheduled Cron Backup (Recommended on VPS / Docker)
Run daily at midnight:
```cron
0 0 * * * cd /app && node scripts/backup-db.js backup >> /var/log/opp_backup.log 2>&1
```

---

## 6. Verification Checklist Before Public Launch

- [x] **Multi-Tenant Test Suite**: `npx tsx --test server/tests/multiTenantAuth.test.ts` (18/18 subtests passing).
- [x] **Full Regression Suite**: All 9 engine suites passing (`practicalGuide`, `actionPlan`, `learning`, `combiner`, `opportunity`, `discovery`, `discoveryIntegration`, `scan`).
- [x] **Production Build**: `npm run build` succeeds cleanly with 0 TypeScript errors.
- [x] **Zero Cross-Tenant Leakage**: Tested cross-user isolation on profiles, action plans, direct IDs, progress metrics, and learning signals.
- [x] **Cryptographic Security**: Passwords hashed with `scrypt` (16-byte salt), timing-safe comparisons, signed JWTs.
- [x] **Split Hosting CORS**: `CORS_ORIGIN` whitelist verified; credentials allowed.
- [x] **SPA Routing**: `vercel.json` provides complete fallback to `index.html`.
- [x] **Safe Backups**: Verified online atomic snapshot creation via `scripts/backup-db.js`.
