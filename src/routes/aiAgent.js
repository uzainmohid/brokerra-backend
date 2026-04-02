/**
 * FILE: aiAgent.js
 * FINAL PATH: brokerra-backend/src/routes/aiAgent.js
 * ACTION: REPLACE (adds one new route to the existing file)
 */

const express    = require('express')
const auth       = require('../middleware/auth')
const controller = require('../controllers/aiAgentController')
const { composeFollowUp } = require('../controllers/composeController') // ← NEW

const router = express.Router()

router.use(auth)

// Existing routes — do not change
router.get('/insights',        controller.getInsights)
router.get('/priorities',      controller.getPriorities)
router.get('/pipeline-health', controller.getPipelineHealth)

// NEW: AI Follow-Up Composer
// POST /api/ai-agent/compose-followup
// Body: { leadId: string }
router.post('/compose-followup', composeFollowUp)

module.exports = router
