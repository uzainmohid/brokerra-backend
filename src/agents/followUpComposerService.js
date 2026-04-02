/**
 * FILE: followUpComposerService.js
 * FINAL PATH: brokerra-backend/src/agents/followUpComposerService.js
 * ACTION: CREATE
 *
 * AI Follow-Up Composer Engine
 * Generates 3 personalised messages from real lead data.
 * No paid AI API. Pure heuristic logic on existing CRM data.
 */

const dayjs = require('dayjs')

function formatBudget(budget) {
  if (!budget) return null
  if (budget >= 10_000_000) return `₹${(budget / 10_000_000).toFixed(1)} Cr`
  if (budget >= 100_000)    return `₹${(budget / 100_000).toFixed(0)} L`
  return `₹${budget.toLocaleString('en-IN')}`
}

function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getIntent(status) {
  const map = {
    NEW:         'first_contact',
    CONTACTED:   'build_interest',
    FOLLOW_UP:   'keep_warm',
    SITE_VISIT:  'post_visit',
    NEGOTIATION: 'push_close',
    CLOSED:      'referral_ask',
    LOST:        'win_back',
  }
  return map[status?.toUpperCase()] || 'keep_warm'
}

function getIntentLabel(intent) {
  const map = {
    first_contact:  'First Contact',
    build_interest: 'Building Interest',
    keep_warm:      'Keeping Warm',
    post_visit:     'Post Site Visit',
    push_close:     'Ready to Close',
    referral_ask:   'Asking for Referral',
    win_back:       'Win Back',
  }
  return map[intent] || 'Follow Up'
}

function buildWhatsApp({ firstName, prop, budget, location, intent, inactiveDays, isHot, noteContext }) {
  const lines = []

  if (intent === 'first_contact') {
    lines.push(`${timeGreeting()} ${firstName}! 👋`, '')
    lines.push(`I came across a ${prop} in ${location} that fits your requirement perfectly.`)
    if (budget) lines.push(`It's well within your budget of ${budget}.`)
    lines.push('', 'Would love to share the details. Are you free for a quick call today?')

  } else if (intent === 'push_close') {
    lines.push(`${timeGreeting()} ${firstName}! 👋`, '')
    lines.push(`We're very close to finalising your deal. I've spoken to the developer and there's a small window to get you the best price.`)
    if (budget) lines.push(`Given your budget of ${budget}, this deal makes strong financial sense.`)
    lines.push('', `Can we finalise today or tomorrow? Let me know your preferred time. 🤝`)

  } else if (intent === 'post_visit') {
    lines.push(`Hi ${firstName}! 😊`, '')
    lines.push(`After your site visit, I wanted to follow up — what did you think?`)
    lines.push('', `If you have any questions on pricing, possession, or paperwork, I'm happy to clear them up right now.`)
    lines.push('', `The unit is moving fast — let me know if you'd like to lock it in. 🔑`)

  } else if (intent === 'win_back') {
    lines.push(`Hi ${firstName}, hope you're well! 🙏`, '')
    lines.push(`I know we didn't move forward earlier, but a new ${prop} just became available in ${location} at a great price.`)
    lines.push('', `No pressure — just wanted to let you know in case you're still exploring. 😊`)

  } else {
    const opening = inactiveDays > 7
      ? `It's been a while since we last spoke —`
      : `Hope you're doing well —`
    lines.push(`Hi ${firstName}! 🙏`, '')
    lines.push(`${opening} just wanted to check in on your ${prop} search in ${location}.`)
    if (isHot) lines.push(``, `Good units here are moving fast. I'd hate for you to miss out.`)
    lines.push('', `I have something new that might interest you. Shall I send the details?`)
  }

  return lines.join('\n')
}

function buildCallScript({ firstName, prop, budget, location, intent, inactiveDays, noteContext, hasNotes }) {
  const lines = [
    `📞 CALL SCRIPT — ${firstName}`,
    '',
    `Opening:`,
    `"${timeGreeting()}, ${firstName}! This is [Your Name] from Brokerra. Hope I'm not catching you at a bad time?"`,
    '',
  ]

  if (intent === 'push_close') {
    lines.push(
      `Purpose:`,
      `"I'm calling because we're very close to finalising your ${prop} deal and I wanted to make sure you have everything you need to move forward."`,
      '',
      `Key Points:`,
      budget ? `• "The price aligns well with your ${budget} budget"` : null,
      `• "I can get you a final price confirmation today if we decide now"`,
      `• "I'll handle all paperwork — zero hassle on your end"`,
      '',
      `Close:`,
      `"Can we plan a quick meeting this week to sign the LOI? I can come to you."`,
    )
  } else if (intent === 'post_visit') {
    lines.push(
      `Purpose:`,
      `"I wanted to follow up on the site visit and get your honest feedback."`,
      '',
      `Key Questions to Ask:`,
      `• "What did you like most about the property?"`,
      `• "Was there anything you'd want changed or improved?"`,
      `• "How does it compare to the other options you've seen?"`,
      '',
      `Close:`,
      `"Based on your feedback, I can negotiate on the price and terms. Want me to make an offer?"`,
    )
  } else {
    lines.push(
      `Purpose:`,
      `"I've shortlisted some ${prop} options in ${location} and wanted your quick feedback."`,
      '',
      `Key Points:`,
      budget ? `• "All options are within ${budget}"` : null,
      `• "I can arrange a site visit at your convenience"`,
      hasNotes ? `• Context from your notes: "${noteContext.slice(0, 80)}"` : null,
      '',
      `Close:`,
      `"Can I WhatsApp you the details right after this call?"`,
    )
  }

  return lines.filter(l => l !== null).join('\n')
}

function buildEmail({ firstName, prop, budget, location, intent, inactiveDays, noteContext, hasNotes }) {
  const subject = intent === 'push_close'
    ? `Re: Your ${prop} in ${location} — Next Steps`
    : intent === 'win_back'
    ? `New listings that might interest you — ${prop} in ${location}`
    : `Following up on your ${prop} search`

  const lines = [
    `Subject: ${subject}`,
    '',
    `Dear ${firstName},`,
    '',
  ]

  if (intent === 'push_close') {
    lines.push(
      `Thank you for your time and patience throughout this process. We are very close to finalising your ${prop} deal in ${location}.`,
      '',
      budget ? `The pricing is well within your ${budget} budget, and I have been able to negotiate favourable terms for you.` : null,
      '',
      `I would like to schedule a brief meeting at your convenience to review the final offer and move to the next step. Please let me know your availability this week.`,
      '',
      `Warm regards`,
    )
  } else if (intent === 'win_back') {
    lines.push(
      `I hope you are doing well. A fresh ${prop} listing has just come to market in ${location} that I believe strongly aligns with what you were looking for earlier.`,
      '',
      budget ? `The pricing is very competitive within the ${budget} range.` : null,
      '',
      `I would be happy to share the full details and arrange a viewing — no commitment required.`,
      '',
      `Looking forward to hearing from you.`,
    )
  } else {
    lines.push(
      `I hope this message finds you well. I am following up on your enquiry regarding ${prop} in ${location}.`,
      '',
      `I have identified some strong options that match your requirements${budget ? ` within your ${budget} budget` : ''}.`,
      '',
      hasNotes ? `Taking into account your specific requirements — ${noteContext.slice(0, 100)} — I am confident these will interest you.` : null,
      '',
      `Please let me know a convenient time for a brief call or site visit.`,
      '',
      `Best regards`,
    )
  }

  return lines.filter(l => l !== null).join('\n')
}

/**
 * Main export — takes a normalised lead object, returns 3 messages.
 */
function composeFollowUpMessages(lead) {
  const firstName    = lead.name?.split(' ')[0] || lead.name || 'there'
  const prop         = lead.propertyType || 'property'
  const budget       = formatBudget(lead.budget)
  const location     = lead.location?.split(',')[0] || lead.location || 'your preferred area'
  const intent       = getIntent(lead.status)
  const noteContext  = lead.noteText || (Array.isArray(lead.notes) && lead.notes[0]?.content) || ''
  const hasNotes     = noteContext.length > 0
  const isHot        = ['hot', 'HOT'].includes(lead.temperature)

  const inactiveDays = dayjs().diff(
    dayjs(lead.updatedAt || lead.lastContactedAt || lead.createdAt), 'day'
  )

  const ctx = { firstName, prop, budget, location, intent, inactiveDays, isHot, noteContext, hasNotes }

  return {
    messages: [
      { channel: 'whatsapp', label: 'WhatsApp Message',       tone: 'conversational', message: buildWhatsApp(ctx) },
      { channel: 'call',     label: 'Call Script',            tone: 'professional',   message: buildCallScript(ctx) },
      { channel: 'email',    label: 'Email / Re-engagement',  tone: 'formal',         message: buildEmail(ctx) },
    ],
    context: {
      intent,
      intentLabel:  getIntentLabel(intent),
      inactiveDays,
      temperature:  lead.temperature?.toLowerCase(),
      stage:        lead.status?.toLowerCase(),
    },
  }
}

module.exports = { composeFollowUpMessages }
