/**
 * ─── Brokerra AI Agent — Controller ──────────────────────────────────────────
 *
 * Three endpoints:
 *   GET /api/ai-agent/insights        → per-lead actionable insights
 *   GET /api/ai-agent/priorities      → today's top-priority leads
 *   GET /api/ai-agent/pipeline-health → full pipeline health analysis
 *
 * All read-only — no writes to the DB.
 */

const prisma                 = require('../config/database')
const { ok, fail }           = require('../utils/response')
const { generateAllInsights } = require('../agents/dealAgent')
const { getPriorityLeads }    = require('../agents/dealAgent')
const { analyzePipeline }     = require('../agents/pipelineAnalyzer')
const {
  STATUS_ENUM_TO_SLUG,
  TEMP_ENUM_TO_SLUG,
  SOURCE_ENUM_TO_SLUG,
} = require('../config/constants')

// ── Shared lead query (exclude closed/lost by default for performance) ────────
async function fetchLeads(userId, includeResolved = false) {
  const where = { assignedTo: userId }
  if (!includeResolved) {
    where.status = { notIn: ['CLOSED', 'LOST'] }
  }

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take:    300, // cap for performance
  })

  // Normalise enums to slugs so agent logic matches frontend conventions
  return leads.map(normaliseLead)
}

/**
 * GET /api/ai-agent/insights
 *
 * Returns a list of AI insights — one per lead, sorted by urgency.
 * Open leads only (excludes closed/lost).
 */
async function getInsights(req, res, next) {
  try {
    const leads    = await fetchLeads(req.user.id, false)
    const insights = generateAllInsights(leads)

    ok(res, {
      insights,
      total:    insights.length,
      critical: insights.filter(i => i.urgency === 'critical').length,
      high:     insights.filter(i => i.urgency === 'high').length,
    }, 'AI insights generated')
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/ai-agent/priorities
 *
 * Returns today's top-8 priority leads with conversion probability.
 */
async function getPriorities(req, res, next) {
  try {
    const leads    = await fetchLeads(req.user.id, false)
    const priority = getPriorityLeads(leads)

    ok(res, {
      priorities: priority,
      total:      priority.length,
    }, 'Priority leads generated')
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/ai-agent/pipeline-health
 *
 * Full pipeline health including all leads (closed + lost included for win rate).
 */
async function getPipelineHealth(req, res, next) {
  try {
    const leads  = await fetchLeads(req.user.id, true)
    const health = analyzePipeline(leads)

    ok(res, health, 'Pipeline health computed')
  } catch (err) {
    next(err)
  }
}

// ── Normalise Prisma lead → agent-friendly format ─────────────────────────────
function normaliseLead(lead) {
  return {
    ...lead,
    status:      STATUS_ENUM_TO_SLUG[lead.status]      || lead.status,
    temperature: TEMP_ENUM_TO_SLUG[lead.temperature]   || lead.temperature,
    source:      SOURCE_ENUM_TO_SLUG[lead.source]       || lead.source,
    // Keep original enum versions for the agent (it uses uppercase internally)
    _statusEnum:      lead.status,
    _temperatureEnum: lead.temperature,
  }
}

module.exports = { getInsights, getPriorities, getPipelineHealth }
