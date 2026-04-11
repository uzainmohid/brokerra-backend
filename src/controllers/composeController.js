const prisma   = require('../config/database')
const { ok, fail } = require('../utils/response')
const { composeFollowUpMessages } = require('../agents/followUpComposerService')

async function generateFollowUp(req, res, next) {
  try {
    const { leadId } = req.body
    if (!leadId) return fail(res, 'leadId is required', 400)

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, assignedTo: req.user.id },
    })
    if (!lead) return fail(res, 'Lead not found', 404)

    const result = composeFollowUpMessages(lead)
    ok(res, result, 'Follow-up messages generated')
  } catch (err) {
    next(err)
  }
}

module.exports = { generateFollowUp }