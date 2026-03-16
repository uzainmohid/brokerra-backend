# BROKERRA — Backend API

> Never Lose a Property Lead Again — AI Follow-Up Intelligence CRM

Express.js + PostgreSQL + Prisma backend powering the Brokerra SaaS platform.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# → Edit DATABASE_URL, JWT_SECRET in .env

# 3. Run database migrations
npx prisma migrate dev --name init

# 4. Seed demo data
npm run prisma:seed

# 5. Start the server
npm run dev
# → http://localhost:5000
```

**Demo account:** `demo@brokerra.in` / `demo1234`

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) | Optional |
| `PORT` | Server port (default: `5000`) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |
| `FRONTEND_URL` | CORS allowed origin (default: `http://localhost:3000`) | Optional |

---

## API Reference

### Auth

```
POST /api/auth/register
Body: { email, password, name?, phone?, company? }
Returns: { token, user }

POST /api/auth/login
Body: { email, password }
Returns: { token, user }
```

### Leads (all protected — Bearer token required)

```
GET    /api/leads?search=&status=&temperature=&source=&page=&limit=&sortBy=&sortOrder=
POST   /api/leads
GET    /api/leads/:id
PUT    /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/:id/summarize  → { summary: string }
```

### Analytics

```
GET /api/analytics?period=30d
```

Returns: overview KPIs, leadsBySource, conversionFunnel, monthlyTrend, revenuePotential, topPerformingBrokers, leadVelocity

### Export

```
GET /api/export/leads-csv        → CSV download
GET /api/export/monthly-report   → JSON report
GET /api/export/pipeline-csv     → Active pipeline CSV
```

---

## Architecture

```
server.js                   Express entry point
src/
  config/
    database.js             Prisma client singleton
    constants.js            Enum maps + scoring weights
  middleware/
    auth.js                 JWT verify middleware
    validate.js             Zod request validator
    errorHandler.js         Global error handler
  routes/
    auth.js                 POST /api/auth/*
    leads.js                CRUD + /summarize
    analytics.js            GET /api/analytics
    export.js               GET /api/export/*
  controllers/
    authController.js
    leadController.js
    analyticsController.js
  services/
    authService.js          Register + login logic
    leadService.js          CRUD + activity timeline
    scoringService.js       Priority score algorithm
    analyticsService.js     KPIs + charts data
    exportService.js        CSV + report generation
    summaryService.js       AI-style lead summary engine
  utils/
    leadTransform.js        Enum ↔ slug conversions
    response.js             Standardized response helpers
prisma/
  schema.prisma             Full DB schema
  seed.js                   Demo data seeder
```

---

## Lead Status Flow

```
NEW → CONTACTED → FOLLOW_UP → SITE_VISIT → NEGOTIATION → CLOSED
                                                        ↘ LOST
```

Frontend sends lowercase slugs (`follow-up`, `site-visit`). Backend maps to Prisma enums (`FOLLOW_UP`, `SITE_VISIT`).

---

## Priority Scoring Algorithm

| Condition | Points |
|---|---|
| Budget ≥ ₹1Cr | +40 |
| Budget ≥ ₹50L | +20 |
| Budget ≥ ₹20L | +10 |
| Overdue follow-up | +30 |
| Hot temperature | +15 |
| Warm temperature | +5 |
| Negotiation stage | +20 |
| Site visit stage | +15 |
| Contacted stage | +5 |
| New lead | +10 |

Max score: 100

---

## Deployment

### Railway

```bash
# Set environment variables in Railway dashboard
# Connect GitHub repo → auto-deploy on push
# Add PostgreSQL plugin for database
```

### Render

```bash
# Build command: npm install && npx prisma generate && npx prisma migrate deploy
# Start command: npm start
# Add PostgreSQL database from Render dashboard
```

### Docker

```bash
docker build -t brokerra-backend .
docker run -p 5000:5000 --env-file .env brokerra-backend
```

---

## Database Commands

```bash
npx prisma migrate dev          # Run migrations in dev
npx prisma migrate deploy       # Run migrations in production
npx prisma generate             # Regenerate Prisma client
npx prisma studio               # Visual DB browser
npm run prisma:seed             # Seed demo data
```
