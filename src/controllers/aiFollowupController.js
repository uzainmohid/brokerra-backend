const followupService = require('../services/aiFollowupService')
const { ok } = require('../utils/response')

const generateFollowUp = async (req, res, next) => {
  try {
    const { leadId } = req.body
    
    if (!leadId) {
      const err = new Error('leadId is required')
      err.status = 400
      throw err
    }

    // ✅ FIX HERE
    const userId = req.user?.id || null

    const result = await followupService.generateFollowUpMessages(
      leadId,
      userId
    )

    ok(res, result, 'Follow-up messages generated successfully.')

  } catch (err) {
    next(err)
  }
}

module.exports = { generateFollowUp }