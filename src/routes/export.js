const router = require('express').Router()
const ctrl   = require('../controllers/analyticsController')
const auth   = require('../middleware/auth')

router.use(auth)

// These match the exact routes the frontend calls:
// GET /api/export/leads-csv
// GET /api/export/monthly-report

router.get('/leads-csv',      ctrl.getExportLeadsCsv)
router.get('/monthly-report', ctrl.getMonthlyReport)
router.get('/pipeline-csv',   ctrl.getPipelineCsv)

module.exports = router
