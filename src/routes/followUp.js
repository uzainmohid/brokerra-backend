const express  = require('express')
const auth     = require('../middleware/auth')
const { generateFollowUp } = require('../controllers/composeController')

const router = express.Router()
router.use(auth)

// POST /api/ai-followup/generate
router.post('/generate', generateFollowUp)

module.exports = router