const prisma = require('../config/database')
const { transformLead, transformLeadInput, transformActivity, transformFollowUp } = require('../utils/leadTransform')
const { computeLeadIntelligence } = require('./scoringService')
const { STATUS_SLUG_TO_ENUM, TEMP_SLUG_TO_ENUM, SOURCE_SLUG_TO_ENUM } = require('../config/constants')
const dayjs = require('dayjs')

// ─── Helper: build Prisma where clause from query params ──────────────────────
function buildWhereClause(query, userId) {
  const where = {}

  // Only return leads assigned to this user (or unassigned)
  // For MVP, return all leads — multi-tenant filtering can be added later
  // where.assignedTo = userId

  if (query.search) {
    where.OR = [
      { name:  { contains: query.search, mode: 'insensitive' } },
      { phone: { contains: query.search } },
      { email: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  if (query.status && query.status !== 'all') {
    where.status = STATUS_SLUG_TO_ENUM[query.status] || query.status.toUpperCase().replace('-', '_')
  }

  if (query.temperature && query.temperature !== 'all') {
    where.temperature = TEMP_SLUG_TO_ENUM[query.temperature] || query.temperature.toUpperCase()
  }

  if (query.source && query.source !== 'all') {
    where.source = SOURCE_SLUG_TO_ENUM[query.source] || query.source.toUpperCase().replace('-', '_')
  }

  return where
}

// ─── GET /api/leads ───────────────────────────────────────────────────────────
async function getLeads(query, userId) {
  const page  = Math.max(1, parseInt(query.page)  || 1)
  const limit = Math.min(100, parseInt(query.limit) || 20)
  const skip  = (page - 1) * limit

  const sortBy    = query.sortBy || 'createdAt'
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc'

  // Whitelist sortable columns
  const allowedSort = ['createdAt', 'updatedAt', 'name', 'budget', 'priorityScore', 'status']
  const orderBy     = allowedSort.includes(sortBy) ? { [sortBy]: sortOrder } : { createdAt: 'desc' }

  const where = buildWhereClause(query, userId)

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy, skip, take: limit }),
    prisma.lead.count({ where }),
  ])

  return {
    data:       leads.map(transformLead),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// ─── GET /api/leads/:id ───────────────────────────────────────────────────────
async function getLeadById(id) {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      followUps:  { orderBy: { createdAt: 'desc' }, take: 20 },
      summaries:  { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!lead) {
    const err = new Error('Lead not found.')
    err.status = 404
    throw err
  }

  // Map nested relations to frontend shapes
  const latest = lead.summaries?.[0]

  return {
    ...transformLead(lead),
    notes: lead.followUps
      .filter((f) => f.note)
      .map((f) => ({
        id:        f.id,
        leadId:    f.leadId,
        content:   f.note,
        createdBy: f.createdBy || 'You',
        createdAt: f.createdAt,
      })),
    followUps:  lead.followUps.map(transformFollowUp),
    activities: lead.activities.map(transformActivity),
    aiSummary:  latest?.summary || null,
  }
}

// ─── POST /api/leads ──────────────────────────────────────────────────────────
async function createLead(body, userId) {
  const input = transformLeadInput(body)

  // Remove id if passed
  delete input.id
  delete input.createdAt
  delete input.updatedAt

  // Attach assignedTo
  if (!input.assignedTo) input.assignedTo = userId

  // Compute initial intelligence
  const intel = computeLeadIntelligence({
    ...input,
    status:      input.status || 'NEW',
    temperature: input.temperature || 'WARM',
    createdAt:   new Date(),
  })

  const lead = await prisma.lead.create({
    data: {
      ...input,
      ...intel,
      status:      input.status || 'NEW',
      temperature: input.temperature || 'WARM',
      source:      input.source || 'OTHER',
    },
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      leadId:      lead.id,
      type:        'CREATED',
      description: `Lead created — ${lead.name}`,
      createdBy:   userId,
    },
  })

  return transformLead(lead)
}

// ─── PUT /api/leads/:id ───────────────────────────────────────────────────────
async function updateLead(id, body, userId) {
  const existing = await prisma.lead.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('Lead not found.')
    err.status = 404
    throw err
  }

  const input = transformLeadInput(body)
  delete input.id
  delete input.createdAt

  // Detect status change for timeline
  const statusChanged = input.status && input.status !== existing.status

  // Re-compute scoring
  const merged = { ...existing, ...input }
  const intel  = computeLeadIntelligence(merged)

  const lead = await prisma.lead.update({
    where: { id },
    data:  { ...input, ...intel },
  })

  // Timeline events
  const logs = []

  if (statusChanged) {
    logs.push({
      leadId:      id,
      type:        'STATUS_CHANGED',
      description: `Status changed to ${lead.status.replace('_', ' ')}`,
      createdBy:   userId,
    })
  } else {
    logs.push({
      leadId:      id,
      type:        'UPDATED',
      description: `Lead details updated`,
      createdBy:   userId,
    })
  }

  await prisma.activityLog.createMany({ data: logs })

  return transformLead(lead)
}

// ─── DELETE /api/leads/:id ────────────────────────────────────────────────────
async function deleteLead(id) {
  const existing = await prisma.lead.findUnique({ where: { id } })
  if (!existing) {
    const err = new Error('Lead not found.')
    err.status = 404
    throw err
  }
  await prisma.lead.delete({ where: { id } })
}

// ─── POST /api/leads/:id/notes (internal — called from follow-up) ──────────────
async function addNote(leadId, content, userId) {
  const entry = await prisma.followUpHistory.create({
    data: {
      leadId,
      note:        content,
      followUpDate: new Date(),
      type:        'CALL',
      status:      'COMPLETED',
      createdBy:   userId,
    },
  })

  await prisma.activityLog.create({
    data: {
      leadId,
      type:        'NOTE_ADDED',
      description: `Note added`,
      createdBy:   userId,
    },
  })

  return {
    id:        entry.id,
    leadId:    entry.leadId,
    content:   entry.note,
    createdBy: entry.createdBy || 'You',
    createdAt: entry.createdAt,
  }
}

module.exports = { getLeads, getLeadById, createLead, updateLead, deleteLead, addNote }
