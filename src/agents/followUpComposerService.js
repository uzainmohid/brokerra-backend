const dayjs = require('dayjs')

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBudget(b) {
  if (!b) return null
  if (b >= 10_000_000) return `₹${(b / 10_000_000).toFixed(1)} Cr`
  if (b >= 100_000)    return `₹${(b / 100_000).toFixed(0)} L`
  return `₹${b.toLocaleString('en-IN')}`
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getIntent(status) {
  return {
    NEW:         'first_contact',
    CONTACTED:   'build_interest',
    FOLLOW_UP:   'keep_warm',
    SITE_VISIT:  'post_visit',
    NEGOTIATION: 'push_close',
    CLOSED:      'referral_ask',
    LOST:        'win_back',
  }[status] || 'keep_warm'
}

function getIntentLabel(intent) {
  return {
    first_contact:  'First Contact',
    build_interest: 'Building Interest',
    keep_warm:      'Keeping Warm',
    post_visit:     'Post Site Visit',
    push_close:     'Ready to Close',
    referral_ask:   'Asking for Referral',
    win_back:       'Win Back',
  }[intent] || 'Follow Up'
}

// ── WhatsApp ──────────────────────────────────────────────────────────────────

function buildWhatsApp({ firstName, prop, budget, location, intent, inactiveDays, isHot }) {
  if (intent === 'first_contact') return [
    `${greeting()} ${firstName}! 👋`, '',
    `I came across a ${prop} in ${location} that fits your requirement perfectly.`,
    budget ? `It's well within your budget of ${budget}.` : null, '',
    `Would you be free for a quick call today?`,
  ].filter(l => l !== null).join('\n')

  if (intent === 'push_close') return [
    `${greeting()} ${firstName}! 👋`, '',
    `We're very close to finalising. I've spoken to the developer and there's a small window to lock in the best price.`,
    budget ? `Given your budget of ${budget}, this deal makes strong sense.` : null, '',
    `Can we finalise today or tomorrow? Let me know your time. 🤝`,
  ].filter(l => l !== null).join('\n')

  if (intent === 'post_visit') return [
    `Hi ${firstName}! 😊`, '',
    `After your site visit, I wanted to follow up — what did you think?`, '',
    `If you have any questions on pricing or possession, happy to clear them now.`, '',
    `The unit is moving fast — want to lock it in? 🔑`,
  ].join('\n')

  if (intent === 'win_back') return [
    `Hi ${firstName}, hope you're well! 🙏`, '',
    `I know we didn't move forward earlier, but a new ${prop} just became available in ${location} at a great price.`, '',
    `No pressure — just wanted to let you know. 😊`,
  ].join('\n')

  // keep_warm / build_interest
  const opening = inactiveDays > 7 ? `It's been a while since we last spoke —` : `Hope you're doing well —`
  return [
    `Hi ${firstName}! 🙏`, '',
    `${opening} checking in on your ${prop} search in ${location}.`,
    isHot ? `Good units here are moving fast. I'd hate for you to miss out.` : null, '',
    `I have something new that might interest you. Shall I send the details?`,
  ].filter(l => l !== null).join('\n')
}

// ── Call Script ───────────────────────────────────────────────────────────────

function buildCallScript({ firstName, prop, budget, location, intent, noteContext, hasNotes }) {
  const lines = [
    `📞 CALL SCRIPT — ${firstName}`, '',
    `Opening:`,
    `"${greeting()}, ${firstName}! This is [Your Name] from Brokerra. Hope I'm not catching you at a bad time?"`, '',
  ]

  if (intent === 'push_close') {
    lines.push(
      `Purpose:`,
      `"I'm calling because we're very close to finalising your ${prop} deal and I wanted to make sure you have everything to move forward confidently."`, '',
      `Key Points:`,
      budget ? `• "The price aligns well with your ${budget} budget"` : null,
      `• "I can get a final price confirmation today if we decide now"`,
      `• "I'll handle all paperwork — zero hassle on your end"`, '',
      `Close:`,
      `"Can we plan a quick meeting this week to sign? I can come to you."`,
    )
  } else if (intent === 'post_visit') {
    lines.push(
      `Purpose:`,
      `"I wanted to follow up on the site visit and get your honest feedback."`, '',
      `Key Questions:`,
      `• "What did you like most about the property?"`,
      `• "Was there anything you'd want changed?"`,
      `• "How does it compare to the other options you've seen?"`, '',
      `Close:`,
      `"Based on your feedback, I can negotiate on the price. Want me to make an offer?"`,
    )
  } else {
    lines.push(
      `Purpose:`,
      `"I've shortlisted some ${prop} options in ${location} and wanted your feedback."`, '',
      `Key Points:`,
      budget ? `• "All options are within ${budget}"` : null,
      `• "I can arrange a site visit at your convenience"`,
      hasNotes ? `• Context: "${noteContext.slice(0, 80)}"` : null, '',
      `Close:`,
      `"Can I WhatsApp you the details right after this call?"`,
    )
  }

  return lines.filter(l => l !== null).join('\n')
}

// ── Email ─────────────────────────────────────────────────────────────────────

function buildEmail({ firstName, prop, budget, location, intent, noteContext, hasNotes }) {
  const subject = intent === 'push_close'
    ? `Re: Your ${prop} in ${location} — Next Steps`
    : intent === 'win_back'
    ? `New listing you might like — ${prop} in ${location}`
    : `Following up on your ${prop} search`

  const lines = [`Subject: ${subject}`, '', `Dear ${firstName},`, '']

  if (intent === 'push_close') {
    lines.push(
      `Thank you for your patience throughout this process. We are very close to finalising your ${prop} deal in ${location}.`, '',
      budget ? `The pricing is well within your ${budget} budget, and I have negotiated favourable terms for you.` : null, '',
      `I would like to schedule a brief meeting to review the final offer and move forward. Please share your availability this week.`, '',
      `Warm regards`,
    )
  } else if (intent === 'win_back') {
    lines.push(
      `I hope you are doing well. A fresh ${prop} listing has just come to market in ${location} that I believe aligns well with what you were looking for.`, '',
      budget ? `The pricing is competitive within the ${budget} range.` : null, '',
      `Happy to share details and arrange a viewing — no commitment required.`, '',
      `Looking forward to hearing from you.`,
    )
  } else {
    lines.push(
      `I hope this message finds you well. I am following up on your enquiry regarding ${prop} in ${location}.`, '',
      `I have identified strong options that match your requirements${budget ? ` within your ${budget} budget` : ''}.`, '',
      hasNotes ? `Taking into account — ${noteContext.slice(0, 100)} — I am confident these will interest you.` : null, '',
      `Please let me know a convenient time for a brief call or site visit.`, '',
      `Best regards`,
    )
  }

  return lines.filter(l => l !== null).join('\n')
}

// ── Main export ───────────────────────────────────────────────────────────────

function composeFollowUpMessages(lead) {
  const firstName   = lead.name?.split(' ')[0] || lead.name
  const prop        = lead.propertyType || 'property'
  const budget      = formatBudget(lead.budget)
  const location    = lead.location?.split(',')[0] || lead.location || 'your preferred area'
  const intent      = getIntent(lead.status)
  const noteContext = lead.noteText || ''
  const hasNotes    = noteContext.length > 0
  const isHot       = lead.temperature === 'HOT'

  const inactiveDays = dayjs().diff(
    dayjs(lead.updatedAt || lead.lastFollowUp || lead.createdAt), 'day'
  )

  const ctx = { firstName, prop, budget, location, intent, inactiveDays, isHot, noteContext, hasNotes }

  return {
    messages: [
      { channel: 'whatsapp', label: 'WhatsApp Message',      tone: 'conversational', message: buildWhatsApp(ctx) },
      { channel: 'call',     label: 'Call Script',           tone: 'professional',   message: buildCallScript(ctx) },
      { channel: 'email',    label: 'Email',                 tone: 'formal',         message: buildEmail(ctx) },
    ],
    context: {
      intent,
      intentLabel:  getIntentLabel(intent),
      inactiveDays,
      temperature:  lead.temperature,
      stage:        lead.status,
    },
  }
}

module.exports = { composeFollowUpMessages }