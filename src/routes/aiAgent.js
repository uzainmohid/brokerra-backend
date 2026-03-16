/**
 * ─── Brokerra AI Agent — Routes ──────────────────────────────────────────────
 *
 * All routes require JWT authentication (same auth middleware as all other routes).
 *
 * Mount in server.js:
 *   const aiAgentRoutes = require('./src/routes/aiAgent')
 *   app.use('/api/ai-agent', aiAgentRoutes)
 */

const express    = require('express')
const auth       = require('../middleware/auth')
const controller = require('../controllers/aiAgentController')

const router = express.Router()

// All AI agent routes are protected
router.use(auth)

/**
 * GET /api/ai-agent/insights
 * Returns actionable AI insights for all open leads.
 */
router.get('/insights', controller.getInsights)

/**
 * GET /api/ai-agent/priorities
 * Returns today's top-priority leads with conversion probability.
 */
router.get('/priorities', controller.getPriorities)

/**
 * GET /api/ai-agent/pipeline-health
 * Returns full pipeline health score and breakdown.
 */
router.get('/pipeline-health', controller.getPipelineHealth)

module.exports = router
