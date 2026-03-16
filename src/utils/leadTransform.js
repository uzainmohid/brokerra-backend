const {
  STATUS_ENUM_TO_SLUG,
  STATUS_SLUG_TO_ENUM,
  TEMP_ENUM_TO_SLUG,
  TEMP_SLUG_TO_ENUM,
  SOURCE_ENUM_TO_SLUG,
  SOURCE_SLUG_TO_ENUM,
} = require('../config/constants')

/**
 * Transforms a Prisma Lead record into the shape the frontend expects.
 * Frontend uses lowercase slugs (e.g. "follow-up", "hot", "whatsapp")
 * DB stores uppercase enums (e.g. "FOLLOW_UP", "HOT", "WHATSAPP")
 */
function transformLead(lead) {
  if (!lead) return null
  return {
    ...lead,
    status:      STATUS_ENUM_TO_SLUG[lead.status]      || lead.status.toLowerCase(),
    temperature: TEMP_ENUM_TO_SLUG[lead.temperature]   || lead.temperature.toLowerCase(),
    source:      SOURCE_ENUM_TO_SLUG[lead.source]      || lead.source.toLowerCase(),
    // Rename noteText → notes for backward compat with any frontend field
    notes:       lead.noteText || undefined,
    noteText:    undefined,
  }
}

/**
 * Transforms frontend body values into Prisma-compatible enum values.
 */
function transformLeadInput(body) {
  const out = { ...body }

  if (body.status) {
    out.status = STATUS_SLUG_TO_ENUM[body.status] || body.status.toUpperCase().replace('-', '_')
  }
  if (body.temperature) {
    out.temperature = TEMP_SLUG_TO_ENUM[body.temperature] || body.temperature.toUpperCase()
  }
  if (body.source) {
    out.source = SOURCE_SLUG_TO_ENUM[body.source] || body.source.toUpperCase().replace('-', '_')
  }
  // Map frontend `notes` field → DB `noteText`
  if (body.notes !== undefined) {
    out.noteText = body.notes
    delete out.notes
  }

  return out
}

/**
 * Transforms ActivityLog type enums to lowercase for frontend consumption.
 */
function transformActivity(activity) {
  if (!activity) return null
  return {
    id:          activity.id,
    leadId:      activity.leadId,
    type:        activity.type.toLowerCase(),
    description: activity.description,
    createdBy:   activity.createdBy,
    metadata:    activity.metadata,
    createdAt:   activity.createdAt,
  }
}

/**
 * Transforms FollowUpHistory records for frontend.
 */
function transformFollowUp(f) {
  if (!f) return null
  return {
    id:           f.id,
    leadId:       f.leadId,
    note:         f.note,
    scheduledAt:  f.followUpDate,
    completedAt:  f.status === 'COMPLETED' ? f.updatedAt : undefined,
    type:         f.type.toLowerCase().replace('_', '-'),
    outcome:      f.outcome,
    status:       f.status.toLowerCase(),
    createdAt:    f.createdAt,
  }
}

module.exports = {
  transformLead,
  transformLeadInput,
  transformActivity,
  transformFollowUp,
}
