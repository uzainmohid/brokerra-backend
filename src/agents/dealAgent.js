/**
 * ─── Brokerra AI Agent — Deal Agent ──────────────────────────────────────────
 *
 * Analyses each lead and produces:
 *   • insight type  (label for the UI category)
 *   • headline      (one-line AI message shown in the panel)
 *   • action        (what the broker should do right now)
 *   • urgency       ('critical' | 'high' | 'medium' | 'low')
 *   • conversionPct (from leadScoring)
 *
 * Designed to feel like an AI assistant speaking in plain English.
 * Zero external API calls — pure heuristics on existing CRM data.
 */

const dayjs = require('dayjs')
const {
  calcConversionProbability,
  daysSinceActivity,
  isStalled,
  daysStalled,
} = require('./leadScoring')

// ── Insight type constants ────────────────────────────────────────────────────
const INSIGHT_TYPE = {
  LIKELY_TO_CONVERT:  'likely_to_convert',
  GOING_COLD:         'going_cold',
  STALLED_DEAL:       'stalled_deal',
  HIGH_VALUE:         'high_value',
  OVERDUE_FOLLOWUP:   'overdue_followup',
  FOLLOW_UP_TODAY:    'follow_up_today',
  HOT_NEW_LEAD:       'hot_new_lead',
  REACTIVATE:         'reactivate',
  CLOSE_OPPORTUNITY:  'close_opportunity',
  HEALTHY:            'healthy',
}

/**
 * Generate a single insight object for a lead.
 * Returns the most important insight (one per lead for the panel).
 */
function generateLeadInsight(lead) {
  const conversionPct = calcConversionProbability(lead)
  const stalledDays   = daysStalled(lead)
  const inactiveDays  = daysSinceActivity(lead)
  const budget        = lead.budget || 0
  const isHighValue   = budget >= 10_000_000
  const isHot         = lead.temperature === 'HOT'
  const isCold        = lead.temperature === 'COLD'

  // ── Closed / lost — no insight needed ────────────────────────────────────
  if (lead.status === 'CLOSED' || lead.status === 'LOST') return null

  // ── Overdue follow-up (scheduled and missed) ──────────────────────────────
  if (lead.nextFollowUpAt && dayjs(lead.nextFollowUpAt).isBefore(dayjs())) {
    const hoursOverdue = dayjs().diff(dayjs(lead.nextFollowUpAt), 'hour')
    return {
      type:          INSIGHT_TYPE.OVERDUE_FOLLOWUP,
      headline:      `Follow-up overdue by ${formatDuration(hoursOverdue)}`,
      action:        `Call ${lead.name} now — missed follow-ups kill deals faster than anything.`,
      urgency:       hoursOverdue > 24 ? 'critical' : 'high',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Follow-up scheduled for today ─────────────────────────────────────────
  if (lead.nextFollowUpAt) {
    const hoursUntil = dayjs(lead.nextFollowUpAt).diff(dayjs(), 'hour')
    if (hoursUntil >= 0 && hoursUntil <= 8) {
      return {
        type:          INSIGHT_TYPE.FOLLOW_UP_TODAY,
        headline:      `Follow-up due in ${hoursUntil === 0 ? 'under 1 hour' : `${hoursUntil}h`}`,
        action:        `Reach out to ${lead.name} before the window closes.`,
        urgency:       hoursUntil <= 2 ? 'critical' : 'high',
        conversionPct,
        lead:          summariseLead(lead),
      }
    }
  }

  // ── Negotiation stage — close push ───────────────────────────────────────
  if (lead.status === 'NEGOTIATION' && !isStalled(lead)) {
    return {
      type:          INSIGHT_TYPE.CLOSE_OPPORTUNITY,
      headline:      `Deal is in negotiation — push for close now`,
      action:        `${lead.name} is at 75%+ probability. Present the final offer today.`,
      urgency:       'high',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Stalled deal ──────────────────────────────────────────────────────────
  if (stalledDays >= 7) {
    return {
      type:          INSIGHT_TYPE.STALLED_DEAL,
      headline:      `Deal stalled for ${stalledDays} days`,
      action:        `${lead.name}'s deal has gone quiet. Send a fresh property match or price update to re-engage.`,
      urgency:       stalledDays >= 14 ? 'critical' : 'high',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Going cold ────────────────────────────────────────────────────────────
  if (isCold && inactiveDays >= 5) {
    return {
      type:          INSIGHT_TYPE.GOING_COLD,
      headline:      `Lead going cold — ${inactiveDays} days without contact`,
      action:        `${lead.name} is losing interest. Send a WhatsApp with a new listing that fits their budget.`,
      urgency:       'medium',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Reactivate (not cold, but inactive too long) ──────────────────────────
  if (inactiveDays >= 10 && !['NEGOTIATION', 'SITE_VISIT'].includes(lead.status)) {
    return {
      type:          INSIGHT_TYPE.REACTIVATE,
      headline:      `No activity in ${inactiveDays} days`,
      action:        `Re-engage ${lead.name} with a follow-up call — mention a new property that matches their criteria.`,
      urgency:       'medium',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Hot new lead ──────────────────────────────────────────────────────────
  if (lead.status === 'NEW' && isHot) {
    return {
      type:          INSIGHT_TYPE.HOT_NEW_LEAD,
      headline:      `🔥 Hot new lead just entered the pipeline`,
      action:        `Call ${lead.name} within the next 2 hours — hot leads contacted quickly convert 3× better.`,
      urgency:       'high',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── High-value lead approaching conversion ────────────────────────────────
  if (isHighValue && conversionPct >= 50) {
    return {
      type:          INSIGHT_TYPE.LIKELY_TO_CONVERT,
      headline:      `High-value lead likely to convert`,
      action:        `${lead.name} has a ₹${formatBudget(budget)} budget and ${conversionPct}% conversion probability. Prioritise today.`,
      urgency:       'high',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── High conversion probability ───────────────────────────────────────────
  if (conversionPct >= 60) {
    return {
      type:          INSIGHT_TYPE.LIKELY_TO_CONVERT,
      headline:      `${conversionPct}% chance of closing this deal`,
      action:        `${lead.name} is showing strong intent. Schedule a site visit or present the final offer.`,
      urgency:       'medium',
      conversionPct,
      lead:          summariseLead(lead),
    }
  }

  // ── Healthy — no urgent action needed ────────────────────────────────────
  return null // skip healthy leads from the insights panel
}

/**
 * Generate insights for all leads and return a sorted list
 * (critical first, then by conversionPct desc).
 */
function generateAllInsights(leads) {
  const URGENCY_RANK = { critical: 4, high: 3, medium: 2, low: 1 }

  const insights = leads
    .map(generateLeadInsight)
    .filter(Boolean)
    .sort((a, b) => {
      const urgencyDiff = (URGENCY_RANK[b.urgency] || 0) - (URGENCY_RANK[a.urgency] || 0)
      if (urgencyDiff !== 0) return urgencyDiff
      return b.conversionPct - a.conversionPct
    })

  return insights
}

/**
 * Return today's priority leads: top 5 by urgency + conversionPct,
 * excluding closed/lost.
 */
function getPriorityLeads(leads) {
  return leads
    .filter(l => !['CLOSED', 'LOST'].includes(l.status))
    .map(lead => ({
      ...summariseLead(lead),
      conversionPct: calcConversionProbability(lead),
      stalledDays:   daysStalled(lead),
      inactiveDays:  daysSinceActivity(lead),
      insight:       generateLeadInsight(lead),
    }))
    .sort((a, b) => {
      // Sort by: overdue > hot > conversionPct
      const aOverdue = a.lead?.isOverdue || (a.insight?.urgency === 'critical') ? 1 : 0
      const bOverdue = b.lead?.isOverdue || (b.insight?.urgency === 'critical') ? 1 : 0
      if (bOverdue !== aOverdue) return bOverdue - aOverdue
      return b.conversionPct - a.conversionPct
    })
    .slice(0, 8)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function summariseLead(lead) {
  return {
    id:            lead.id,
    name:          lead.name,
    phone:         lead.phone,
    status:        lead.status,
    temperature:   lead.temperature,
    budget:        lead.budget,
    location:      lead.location,
    propertyType:  lead.propertyType,
    source:        lead.source,
    priorityScore: lead.priorityScore,
    isOverdue:     lead.isOverdue,
    nextFollowUpAt: lead.nextFollowUpAt,
    updatedAt:     lead.updatedAt,
  }
}

function formatDuration(hours) {
  if (hours < 1)  return 'less than an hour'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''}`
}

function formatBudget(budget) {
  if (budget >= 10_000_000) return `${(budget / 10_000_000).toFixed(1)}Cr`
  if (budget >= 100_000)    return `${(budget / 100_000).toFixed(0)}L`
  return budget.toLocaleString('en-IN')
}

module.exports = {
  generateLeadInsight,
  generateAllInsights,
  getPriorityLeads,
  INSIGHT_TYPE,
}
