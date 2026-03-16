/**
 * ─── Brokerra AI Agent — Lead Scoring Engine ──────────────────────────────────
 *
 * Computes conversion probability (0–100%) for each lead using
 * heuristic rules based on pipeline stage, recency, budget, source
 * quality, and engagement signals. No external API required.
 */

const dayjs = require('dayjs')

// ── Source quality weights (referral = highest intent) ────────────────────────
const SOURCE_QUALITY = {
  REFERRAL:        1.0,
  WALK_IN:         0.95,
  WHATSAPP:        0.85,
  PROPERTY_PORTAL: 0.75,
  INSTAGRAM:       0.65,
  FACEBOOK:        0.60,
  WEBSITE:         0.55,
  COLD_CALL:       0.40,
  OTHER:           0.45,
}

// ── Stage base conversion probability ────────────────────────────────────────
const STAGE_BASE_PROBABILITY = {
  NEW:         8,
  CONTACTED:   18,
  FOLLOW_UP:   30,
  SITE_VISIT:  55,
  NEGOTIATION: 75,
  CLOSED:      100,
  LOST:        0,
}

// ── How many days of inactivity start degrading a lead ───────────────────────
const STALL_THRESHOLDS = {
  NEW:         3,
  CONTACTED:   5,
  FOLLOW_UP:   4,
  SITE_VISIT:  7,
  NEGOTIATION: 5,
}

/**
 * Calculate conversion probability (0–100) for a single lead.
 * Returns an integer percentage.
 */
function calcConversionProbability(lead) {
  if (lead.status === 'CLOSED') return 100
  if (lead.status === 'LOST')   return 0

  let score = STAGE_BASE_PROBABILITY[lead.status] || 10

  // ── Temperature modifier ──────────────────────────────────────────────────
  if      (lead.temperature === 'HOT')  score += 15
  else if (lead.temperature === 'WARM') score += 5
  else if (lead.temperature === 'COLD') score -= 8

  // ── Budget signal — higher budget = more motivated buyer ─────────────────
  const budget = lead.budget || 0
  if      (budget >= 20_000_000) score += 12
  else if (budget >= 10_000_000) score += 8
  else if (budget >= 5_000_000)  score += 4

  // ── Source quality modifier ───────────────────────────────────────────────
  const srcQ = SOURCE_QUALITY[lead.source] || 0.5
  score = score * (0.7 + srcQ * 0.3) // blend in source quality

  // ── Recency penalty — inactivity kills deals ──────────────────────────────
  const staleDays = daysSinceActivity(lead)
  const stall     = STALL_THRESHOLDS[lead.status] || 5
  if (staleDays > stall * 3)      score *= 0.40
  else if (staleDays > stall * 2) score *= 0.65
  else if (staleDays > stall)     score *= 0.82

  // ── Follow-up completeness bonus ─────────────────────────────────────────
  if (lead.nextFollowUpAt) {
    const followUpDue = dayjs(lead.nextFollowUpAt)
    const hoursUntil  = followUpDue.diff(dayjs(), 'hour')
    if (hoursUntil > 0 && hoursUntil <= 24) score += 6 // scheduled today = engaged
  }

  return Math.round(Math.min(Math.max(score, 0), 99)) // never 100 unless CLOSED
}

/**
 * Days since last meaningful activity on the lead.
 */
function daysSinceActivity(lead) {
  const candidates = [
    lead.updatedAt,
    lead.lastFollowUp,
    lead.lastContactedAt,
  ].filter(Boolean)

  if (!candidates.length) return dayjs().diff(dayjs(lead.createdAt), 'day')

  const mostRecent = candidates.reduce((latest, d) =>
    dayjs(d).isAfter(dayjs(latest)) ? d : latest
  )
  return dayjs().diff(dayjs(mostRecent), 'day')
}

/**
 * Returns true if the lead is stalled (inactive past its stage threshold).
 */
function isStalled(lead) {
  if (['CLOSED', 'LOST'].includes(lead.status)) return false
  const days  = daysSinceActivity(lead)
  const limit = STALL_THRESHOLDS[lead.status] || 5
  return days >= limit
}

/**
 * Returns days stalled (0 if not stalled).
 */
function daysStalled(lead) {
  if (!isStalled(lead)) return 0
  return daysSinceActivity(lead)
}

module.exports = {
  calcConversionProbability,
  daysSinceActivity,
  isStalled,
  daysStalled,
  SOURCE_QUALITY,
  STAGE_BASE_PROBABILITY,
}
