const router  = require('express').Router()
const ctrl    = require('../controllers/leadController')
const auth    = require('../middleware/auth')

// All lead routes require authentication
router.use(auth)

router.get('/',         ctrl.getLeads)
router.post('/',        ctrl.createLead)
router.get('/:id',      ctrl.getLeadById)
router.put('/:id',      ctrl.updateLead)
router.delete('/:id',   ctrl.deleteLead)
router.post('/:id/summarize', ctrl.summarizeLead)

module.exports = router
