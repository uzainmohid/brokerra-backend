/**
 * FILE: composeController.js
 * FINAL PATH: brokerra-backend/src/controllers/composeController.js
 * ACTION: CREATE
 */

const prisma = require('../config/database')
const { ok, fail } = require('../utils/response')
const { composeFollowUpMessages } = require('../agents/followUpComposerService')
const {
  STATUS_ENUM_TO_SLUG,
  TEMP_ENUM_TO_SLUG,
  SOURCE_ENUM_TO_SLUG,
} = require('../config/constants')

async function composeFollowUp(req, res, next) {
  try {
    const { leadId } = req.body

    if (!leadId) return fail(res, 'leadId is required', 400)

    // Fetch real lead from DB — must belong to the authenticated user
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, assignedTo: req.user.id },
    })

    if (!lead) return fail(res, 'Lead not found', 404)

    // Normalise DB enums → lowercase slugs the composer understands
    const normalisedLead = {
      ...lead,
      status:      STATUS_ENUM_TO_SLUG[lead.status]      || lead.status,
      temperature: TEMP_ENUM_TO_SLUG[lead.temperature]   || lead.temperature,
      source:      SOURCE_ENUM_TO_SLUG[lead.source]       || lead.source,
    }

    const result = composeFollowUpMessages(normalisedLead)

    ok(res, result, 'Follow-up messages generated')
  } catch (err) {
    next(err)
  }
}

module.exports = { composeFollowUp }
