// const router = require('express').Router()
// const ctrl   = require('../controllers/aiFollowupController')
// const auth   = require('../middleware/auth')

// // All AI followup routes require authentication


// router.post('/generate', ctrl.generateFollowUp)

// module.exports = router

const router = require('express').Router()
const ctrl   = require('../controllers/aiFollowupController')
const auth   = require('../middleware/auth')

// ✅ THIS LINE IS REQUIRED
router.use(auth)

router.post('/generate', ctrl.generateFollowUp)

// Debug route
router.get('/test', (req, res) => {
  res.json({ message: "AI Followup route working ✅" })
})

module.exports = router