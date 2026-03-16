const dayjs = require('dayjs')
const { SCORE_WEIGHTS } = require('../config/constants')

/**
 * Calculate priority score (0–100) for a lead.
 * Called after every lead create/update.
 */
function calcPriorityScore(lead) {
  let score = 0

  // ── Budget score ──────────────────────────────────────────────────────────
  const budget = lead.budget || 0
  if (budget >= 10_000_000)     score += SCORE_WEIGHTS.BUDGET_1CR_PLUS  // 1Cr+
  else if (budget >= 5_000_000) score += SCORE_WEIGHTS.BUDGET_50L_PLUS  // 50L+
  else if (budget >= 2_000_000) score += SCORE_WEIGHTS.BUDGET_20L_PLUS  // 20L+

  // ── Overdue follow-up ─────────────────────────────────────────────────────
  const overdue = isOverdue(lead)
  if (overdue) score += SCORE_WEIGHTS.OVERDUE_FOLLOWUP

  // ── Lead status ───────────────────────────────────────────────────────────
  if      (lead.status === 'NEW')         score += SCORE_WEIGHTS.NEW_LEAD
  else if (lead.status === 'CONTACTED')   score += SCORE_WEIGHTS.CONTACTED
  else if (lead.status === 'SITE_VISIT')  score += SCORE_WEIGHTS.SITE_VISIT
  else if (lead.status === 'NEGOTIATION') score += SCORE_WEIGHTS.NEGOTIATION

  // ── Temperature ───────────────────────────────────────────────────────────
  if      (lead.temperature === 'HOT')  score += SCORE_WEIGHTS.HOT_TEMP
  else if (lead.temperature === 'WARM') score += SCORE_WEIGHTS.WARM_TEMP

  // Cap at 100
  return Math.min(score, 100)
}

/**
 * Returns true if a lead's nextFollowUpAt is in the past and not yet closed/lost.
 */
function isOverdue(lead) {
  if (['CLOSED', 'LOST'].includes(lead.status)) return false
  if (!lead.nextFollowUpAt) {
    // No explicit follow-up scheduled — flag as overdue if last contact > 7 days ago
    if (lead.lastFollowUp) {
      const daysSinceLast = dayjs().diff(dayjs(lead.lastFollowUp), 'day')
      return daysSinceLast > 7
    }
    // New lead with no follow-up set — flag after 3 days
    const daysSinceCreated = dayjs().diff(dayjs(lead.createdAt), 'day')
    return daysSinceCreated > 3
  }
  return dayjs(lead.nextFollowUpAt).isBefore(dayjs())
}

/**
 * Returns true if a lead qualifies as a "hot lead" for the dashboard.
 */
function isHotLead(lead) {
  return lead.temperature === 'HOT' || lead.priorityScore >= 60
}

/**
 * Compute all intelligence fields for a lead and return update payload.
 */
function computeLeadIntelligence(lead) {
  const priorityScore = calcPriorityScore(lead)
  const overdue       = isOverdue(lead)
  const hot           = isHotLead({ ...lead, priorityScore })
  return { priorityScore, isOverdue: overdue, isHotLead: hot }
}

module.exports = { calcPriorityScore, isOverdue, isHotLead, computeLeadIntelligence }
