const analyticsService = require('../services/analyticsService')
const exportService    = require('../services/exportService')
const { ok } = require('../utils/response')
const dayjs = require('dayjs')

const getAnalytics = async (req, res, next) => {
  try {
    const period = req.query.period || '30d'
    const data   = await analyticsService.getAnalytics(period)
    ok(res, data)
  } catch (err) { next(err) }
}

const getExportLeadsCsv = async (req, res, next) => {
  try {
    const csv = await exportService.exportLeadsCsv()
    const filename = `brokerra-leads-${dayjs().format('YYYY-MM-DD')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (err) { next(err) }
}

const getMonthlyReport = async (req, res, next) => {
  try {
    const report = await exportService.getMonthlyReport()
    // Return as JSON (frontend handles display) or as downloadable CSV
    const format = req.query.format || 'json'

    if (format === 'csv') {
      const rows = [
        { Metric: 'Report Month',       Value: report.reportMonth },
        { Metric: 'Generated At',       Value: report.generatedAt },
        { Metric: 'Total Leads',        Value: report.totalLeadsThisMonth },
        { Metric: 'New Leads',          Value: report.newLeadsThisMonth },
        { Metric: 'Closed Deals',       Value: report.closedDealsThisMonth },
        { Metric: 'Revenue Realised',   Value: report.revenueRealised },
        { Metric: 'Revenue Potential',  Value: report.revenuePotential },
        { Metric: 'Hot Leads',          Value: report.hotLeads },
        { Metric: 'Conversion Rate',    Value: `${report.conversionRate}%` },
      ]
      const csv = 'Metric,Value\n' + rows.map((r) => `${r.Metric},${r.Value}`).join('\n')
      const filename = `brokerra-report-${dayjs().format('YYYY-MM')}.csv`
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.send(csv)
    }

    ok(res, report)
  } catch (err) { next(err) }
}

const getPipelineCsv = async (req, res, next) => {
  try {
    const csv = await exportService.exportPipelineCsv()
    const filename = `brokerra-pipeline-${dayjs().format('YYYY-MM-DD')}.csv`
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (err) { next(err) }
}

module.exports = { getAnalytics, getExportLeadsCsv, getMonthlyReport, getPipelineCsv }
