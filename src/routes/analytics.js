const router = require('express').Router()
const ctrl   = require('../controllers/analyticsController')
const auth   = require('../middleware/auth')

router.use(auth)

router.get('/',                      ctrl.getAnalytics)
router.get('/export/leads-csv',      ctrl.getExportLeadsCsv)
router.get('/export/monthly-report', ctrl.getMonthlyReport)
router.get('/export/pipeline-csv',   ctrl.getPipelineCsv)

module.exports = router
