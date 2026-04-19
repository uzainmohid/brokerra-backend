const followupService = require('../services/aiFollowupService')
const { ok } = require('../utils/response')

/**
 * POST /api/ai-followup/generate
 * Generates AI-powered follow-up messages for a lead.
 */
const generateFollowUp = async (req, res, next) => {
  try {
    const { leadId } = req.body
    
    if (!leadId) {
      const err = new Error('leadId is required')
      err.status = 400
      throw err
    }

    const result = await followupService.generateFollowUpMessages(leadId, req.user.id)
    ok(res, result, 'Follow-up messages generated successfully.')
  } catch (err) {
    next(err)
  }
}

module.exports = { generateFollowUp }
