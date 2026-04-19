const router = require('express').Router()
const ctrl   = require('../controllers/aiFollowupController')
const auth   = require('../middleware/auth')

// All AI followup routes require authentication
router.use(auth)

router.post('/generate', ctrl.generateFollowUp)

// ADD THIS (for testing)
router.get('/test', (req, res) => {
  res.json({ message: "AI Followup route working ✅" })
})

module.exports = router
