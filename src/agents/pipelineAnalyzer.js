/**
 * ─── Brokerra AI Agent — Pipeline Analyzer ───────────────────────────────────
 *
 * Analyses the full pipeline and returns:
 *   • Health score      (0–100 for the overall pipeline)
 *   • Stage breakdown   (count, value, avg conversion per stage)
 *   • Bottleneck        (which stage has the most stalled leads)
 *   • Win rate          (% of closed from total in last 30 days)
 *   • Revenue forecast  (weighted probability × budget across all stages)
 *   • Agent message     (one-line health narrative for the UI)
 */

const dayjs = require('dayjs')
const { calcConversionProbability, isStalled, daysStalled } = require('./leadScoring')

// Stage ordering for funnel visualisation
const STAGE_ORDER = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED', 'LOST']

// Revenue multiplier per stage (how much of budget to count toward forecast)
const STAGE_REVENUE_WEIGHT = {
  NEW:         0.05,
  CONTACTED:   0.12,
  FOLLOW_UP:   0.25,
  SITE_VISIT:  0.50,
  NEGOTIATION: 0.75,
  CLOSED:      1.00,
  LOST:        0.00,
}

/**
 * Full pipeline health analysis.
 * @param {Lead[]} leads  — all leads from the DB (already filtered to user's leads)
 * @returns {PipelineHealth}
 */
function analyzePipeline(leads) {
  const activeLeads = leads.filter(l => l.status !== 'LOST')
  const closedLeads = leads.filter(l => l.status === 'CLOSED')
  const lostLeads   = leads.filter(l => l.status === 'LOST')
  const openLeads   = leads.filter(l => !['CLOSED', 'LOST'].includes(l.status))

  // ── Stage breakdown ───────────────────────────────────────────────────────
  const stageBreakdown = STAGE_ORDER.map(stage => {
    const stageLeads  = leads.filter(l => l.status === stage)
    const stalledList = stageLeads.filter(isStalled)
    const totalBudget = stageLeads.reduce((s, l) => s + (l.budget || 0), 0)
    const avgConv     = stageLeads.length
      ? Math.round(stageLeads.reduce((s, l) => s + calcConversionProbability(l), 0) / stageLeads.length)
      : 0

    return {
      stage,
      count:        stageLeads.length,
      stalledCount: stalledList.length,
      totalBudget,
      avgConversionPct: avgConv,
    }
  })

  // ── Bottleneck detection — stage with the most stalled leads ─────────────
  const bottleneck = stageBreakdown
    .filter(s => !['CLOSED', 'LOST'].includes(s.stage))
    .sort((a, b) => b.stalledCount - a.stalledCount)[0]

  // ── Revenue forecast (weighted pipeline value) ────────────────────────────
  const forecastRevenue = openLeads.reduce((sum, l) => {
    const weight = STAGE_REVENUE_WEIGHT[l.status] || 0
    const prob   = calcConversionProbability(l) / 100
    return sum + (l.budget || 0) * weight * prob
  }, 0)

  const closedRevenue = closedLeads.reduce((s, l) => s + (l.budget || 0), 0)

  // ── Win rate (closed / (closed + lost)) ──────────────────────────────────
  const resolved = closedLeads.length + lostLeads.length
  const winRate  = resolved > 0 ? Math.round((closedLeads.length / resolved) * 100) : 0

  // ── Health score algorithm ────────────────────────────────────────────────
  const healthScore = calcHealthScore({
    openLeads,
    stageBreakdown,
    winRate,
    closedLeads,
    lostLeads,
  })

  // ── Overdue count ─────────────────────────────────────────────────────────
  const overdueLeads = openLeads.filter(l =>
    l.nextFollowUpAt && dayjs(l.nextFollowUpAt).isBefore(dayjs())
  )

  // ── Agent narrative ───────────────────────────────────────────────────────
  const agentMessage = buildHealthNarrative({
    healthScore,
    bottleneck,
    overdueLeads,
    openLeads,
    winRate,
    forecastRevenue,
  })

  return {
    healthScore,
    agentMessage,
    winRate,
    forecastRevenue: Math.round(forecastRevenue),
    closedRevenue,
    overdueCount:   overdueLeads.length,
    openCount:      openLeads.length,
    totalLeads:     leads.length,
    stageBreakdown,
    bottleneck: bottleneck?.stalledCount > 0 ? bottleneck : null,
  }
}

/**
 * Composite health score (0–100).
 */
function calcHealthScore({ openLeads, stageBreakdown, winRate, closedLeads, lostLeads }) {
  let score = 60 // baseline

  // Win rate contribution
  score += Math.min(winRate * 0.3, 20)

  // Penalise stalled leads
  const totalStalled = stageBreakdown.reduce((s, st) => s + st.stalledCount, 0)
  const stallRatio   = openLeads.length > 0 ? totalStalled / openLeads.length : 0
  score -= stallRatio * 30

  // Bonus for leads deep in the funnel
  const deepLeads = openLeads.filter(l => ['SITE_VISIT', 'NEGOTIATION'].includes(l.status))
  const deepRatio = openLeads.length > 0 ? deepLeads.length / openLeads.length : 0
  score += deepRatio * 15

  // Penalty for excessive lost ratio
  const resolved  = closedLeads.length + lostLeads.length
  const lostRatio = resolved > 0 ? lostLeads.length / resolved : 0
  score -= lostRatio * 15

  return Math.round(Math.min(Math.max(score, 0), 100))
}

/**
 * Build a human-readable one-line health narrative.
 */
function buildHealthNarrative({ healthScore, bottleneck, overdueLeads, openLeads, winRate, forecastRevenue }) {
  if (healthScore >= 75) {
    return `Pipeline is healthy (${healthScore}/100). Win rate ${winRate}% — keep the momentum going.`
  }
  if (overdueLeads.length > 3) {
    return `${overdueLeads.length} overdue follow-ups detected — act now before these deals go cold.`
  }
  if (bottleneck?.stalledCount >= 3) {
    const stageName = bottleneck.stage.replace('_', ' ').toLowerCase()
    return `Bottleneck in ${stageName} — ${bottleneck.stalledCount} deals stalled. Re-engage to unlock pipeline flow.`
  }
  if (winRate < 15) {
    return `Win rate is at ${winRate}%. Focus on higher-intent leads to improve conversion quality.`
  }
  return `Pipeline score ${healthScore}/100. ${openLeads.length} active deals worth ~${formatBudgetShort(forecastRevenue)} weighted value.`
}

function formatBudgetShort(v) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(0)}L`
  return `₹${v.toLocaleString('en-IN')}`
}

module.exports = { analyzePipeline, STAGE_ORDER }
