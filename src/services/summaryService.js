const prisma = require('../config/database')
const dayjs  = require('dayjs')
const { STATUS_ENUM_TO_SLUG, TEMP_ENUM_TO_SLUG, SOURCE_ENUM_TO_SLUG } = require('../config/constants')

/**
 * Generates a rich, intelligent narrative summary for a lead.
 * Uses all available data: profile, activities, notes, follow-ups, scoring.
 * No external API required — deterministic, context-aware generation.
 */
async function generateSummary(leadId, userId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      followUps:  { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })

  if (!lead) {
    const err = new Error('Lead not found.')
    err.status = 404
    throw err
  }

  const summary = buildSummary(lead)

  // Persist to DB
  await prisma.leadSummary.create({
    data: { leadId: lead.id, summary },
  })

  // Update lead's aiSummary field for quick access
  await prisma.lead.update({
    where: { id: lead.id },
    data:  { aiSummary: summary },
  })

  // Activity log
  await prisma.activityLog.create({
    data: {
      leadId,
      type:        'AI_SUMMARY_GENERATED',
      description: 'AI lead summary generated',
      createdBy:   userId,
    },
  })

  return { summary }
}

// ─── Build summary text ───────────────────────────────────────────────────────

function buildSummary(lead) {
  const parts = []

  // ── Opening: identity + profile ────────────────────────────────────────────
  const temp   = TEMP_ENUM_TO_SLUG[lead.temperature] || 'warm'
  const status = STATUS_ENUM_TO_SLUG[lead.status] || 'new'
  const source = SOURCE_ENUM_TO_SLUG[lead.source] || 'other'

  const tempLabel = { hot: '🔥 Hot', warm: '⚡ Warm', cold: '❄️ Cold' }[temp] || temp
  parts.push(`${tempLabel} lead — ${lead.name}${lead.email ? ` (${lead.email})` : ''}, acquired via ${formatSource(source)}.`)

  // ── Property interest ──────────────────────────────────────────────────────
  const propParts = []
  if (lead.propertyType) propParts.push(lead.propertyType)
  if (lead.location)     propParts.push(`in ${lead.location}`)
  if (lead.budget)       propParts.push(`with a budget of ${formatBudget(lead.budget)}`)

  if (propParts.length) {
    parts.push(`Looking for ${propParts.join(' ')}.`)
  }

  // ── Pipeline status ────────────────────────────────────────────────────────
  const statusSentences = {
    'new':         'Lead has just entered the pipeline and has not been contacted yet.',
    'contacted':   'Initial contact has been made. Awaiting further engagement.',
    'follow-up':   'Actively in follow-up stage. Timely re-engagement is critical.',
    'site-visit':  'Site visit has been scheduled or completed. Strong purchase intent.',
    'negotiation': 'Currently in negotiation. High probability of closing.',
    'closed':      'Deal successfully closed. ✅',
    'lost':        'Lead was lost. Review timeline for lessons learned.',
  }
  parts.push(statusSentences[status] || `Current stage: ${status}.`)

  // ── Follow-up intelligence ─────────────────────────────────────────────────
  if (lead.lastFollowUp) {
    const daysAgo = dayjs().diff(dayjs(lead.lastFollowUp), 'day')
    if (daysAgo === 0) {
      parts.push('Last contacted today.')
    } else if (daysAgo === 1) {
      parts.push('Last contacted yesterday.')
    } else if (daysAgo <= 7) {
      parts.push(`Last contacted ${daysAgo} days ago.`)
    } else {
      parts.push(`⚠️ Last contacted ${daysAgo} days ago — follow-up is overdue.`)
    }
  }

  if (lead.nextFollowUpAt) {
    const isOverdue = dayjs(lead.nextFollowUpAt).isBefore(dayjs())
    if (isOverdue) {
      const overdueDays = dayjs().diff(dayjs(lead.nextFollowUpAt), 'day')
      parts.push(`🚨 Follow-up was due ${overdueDays} day${overdueDays !== 1 ? 's' : ''} ago — immediate action required.`)
    } else {
      const inDays = dayjs(lead.nextFollowUpAt).diff(dayjs(), 'day')
      if (inDays === 0)       parts.push('Follow-up scheduled for today.')
      else if (inDays === 1)  parts.push('Follow-up scheduled for tomorrow.')
      else                    parts.push(`Next follow-up in ${inDays} days.`)
    }
  }

  // ── Priority & scoring ─────────────────────────────────────────────────────
  if (lead.priorityScore >= 80) {
    parts.push(`Priority score: ${lead.priorityScore}/100 — treat this lead as highest priority.`)
  } else if (lead.priorityScore >= 50) {
    parts.push(`Priority score: ${lead.priorityScore}/100 — medium-high priority.`)
  } else if (lead.priorityScore > 0) {
    parts.push(`Priority score: ${lead.priorityScore}/100.`)
  }

  // ── Notes / context ────────────────────────────────────────────────────────
  if (lead.noteText) {
    parts.push(`Notes: "${lead.noteText}"`)
  }

  // ── Activity summary ───────────────────────────────────────────────────────
  const actCount = lead.activities?.length || 0
  if (actCount > 1) {
    parts.push(`Total interactions logged: ${actCount}.`)
  }

  // ── Recent follow-up notes ─────────────────────────────────────────────────
  const recentNotes = lead.followUps?.filter((f) => f.note).slice(0, 2)
  if (recentNotes?.length) {
    parts.push(`Recent notes: ${recentNotes.map((f) => `"${f.note}"`).join('; ')}.`)
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  if (lead.tags?.length) {
    parts.push(`Tags: ${lead.tags.join(', ')}.`)
  }

  // ── Recommendation ────────────────────────────────────────────────────────
  parts.push(buildRecommendation(lead, status, temp))

  return parts.join(' ')
}

function buildRecommendation(lead, status, temp) {
  if (status === 'closed')     return 'Request a referral or testimonial from this satisfied client.'
  if (status === 'lost')       return 'Consider a win-back attempt in 60–90 days with a fresh offer.'
  if (lead.isOverdue)          return '🔴 Recommendation: Contact immediately to prevent this lead from going cold.'
  if (status === 'negotiation')return '📋 Recommendation: Prepare final proposal and address any objections promptly.'
  if (status === 'site-visit') return '🏡 Recommendation: Follow up within 24 hours of the site visit while interest is high.'
  if (temp === 'hot')          return '🔥 Recommendation: Prioritize this lead — high probability of conversion with fast action.'
  if (temp === 'cold')         return '❄️ Recommendation: Try a different outreach channel or send a value-add message to re-engage.'
  return '📞 Recommendation: Schedule the next follow-up within 48 hours to maintain momentum.'
}

function formatBudget(amount) {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(0)}L`
  return `₹${amount.toLocaleString('en-IN')}`
}

function formatSource(source) {
  const labels = {
    whatsapp: 'WhatsApp', referral: 'Referral', website: 'Website',
    instagram: 'Instagram', facebook: 'Facebook',
    'property-portal': 'Property Portal', 'cold-call': 'Cold Call',
    'walk-in': 'Walk-In', other: 'Direct',
  }
  return labels[source] || source
}

module.exports = { generateSummary }
