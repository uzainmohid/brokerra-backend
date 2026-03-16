const leadService = require('../services/leadService')
const summaryService = require('../services/summaryService')
const { ok, paginated, fail } = require('../utils/response')

const getLeads = async (req, res, next) => {
  try {
    const result = await leadService.getLeads(req.query, req.user.id)
    res.status(200).json({
      success:    true,
      data:       result.data,
      total:      result.total,
      page:       result.page,
      limit:      result.limit,
      totalPages: result.totalPages,
    })
  } catch (err) { next(err) }
}

const getLeadById = async (req, res, next) => {
  try {
    const lead = await leadService.getLeadById(req.params.id)
    ok(res, lead)
  } catch (err) { next(err) }
}

const createLead = async (req, res, next) => {
  try {
    const lead = await leadService.createLead(req.body, req.user.id)
    ok(res, lead, 'Lead created.', 201)
  } catch (err) { next(err) }
}

const updateLead = async (req, res, next) => {
  try {
    const lead = await leadService.updateLead(req.params.id, req.body, req.user.id)
    ok(res, lead, 'Lead updated.')
  } catch (err) { next(err) }
}

const deleteLead = async (req, res, next) => {
  try {
    await leadService.deleteLead(req.params.id)
    ok(res, null, 'Lead deleted.')
  } catch (err) { next(err) }
}

const summarizeLead = async (req, res, next) => {
  try {
    const result = await summaryService.generateSummary(req.params.id, req.user.id)
    ok(res, result, 'Summary generated.')
  } catch (err) { next(err) }
}

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead, summarizeLead }
