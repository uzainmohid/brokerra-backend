require('dotenv').config()

const express      = require('express')
const cors         = require('cors')
const errorHandler = require('./src/middleware/errorHandler')

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes       = require('./src/routes/auth')
const leadRoutes       = require('./src/routes/leads')
const analyticsRoutes  = require('./src/routes/analytics')
const exportRoutes     = require('./src/routes/export')
const aiAgentRoutes    = require('./src/routes/aiAgent')
const aiFollowupRoutes = require('./src/routes/aiFollowup')

const app  = express()
const PORT = process.env.PORT || 5000

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ─── Request logger (dev) ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`)
    next()
  })
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'Brokerra API',
    version: '1.0.0',
    time:    new Date().toISOString(),
  })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes)
app.use('/api/leads',       leadRoutes)
app.use('/api/analytics',   analyticsRoutes)
app.use('/api/export',      exportRoutes)
app.use('/api/ai-agent', aiAgentRoutes)
app.use('/api/ai-followup', aiFollowupRoutes)

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler)

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════════╗')
  console.log('║          BROKERRA — API Server               ║')
  console.log('╠══════════════════════════════════════════════╣')
  console.log(`║  🚀  Running on  http://localhost:${PORT}         ║`)
  console.log(`║  🌱  Environment: ${(process.env.NODE_ENV || 'development').padEnd(24)}║`)
  console.log('║  ✅  AI Follow-up: ENABLED                   ║')
  console.log('╚══════════════════════════════════════════════╝\n')
  console.log('  Routes:')
  console.log('  POST /api/auth/register')
  console.log('  POST /api/auth/login')
  console.log('  GET  /api/leads')
  console.log('  POST /api/leads')
  console.log('  GET  /api/leads/:id')
  console.log('  PUT  /api/leads/:id')
  console.log('  DELETE /api/leads/:id')
  console.log('  POST /api/leads/:id/summarize')
  console.log('  GET  /api/analytics')
  console.log('  GET  /api/export/leads-csv')
  console.log('  GET  /api/export/monthly-report\n')
  console.log('  POST /api/ai-followup/generate')
  console.log('  GET  /api/ai-followup/test')
})

module.exports = app
