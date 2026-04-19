const router = require('express').Router()
const ctrl   = require('../controllers/aiFollowupController')
const auth   = require('../middleware/auth')

// All AI followup routes require authentication


router.post('/generate', ctrl.generateFollowUp)

module.exports = router
