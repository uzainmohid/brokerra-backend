const prisma = require('../config/database')
const dayjs  = require('dayjs')
const { STATUS_ENUM_TO_SLUG, TEMP_ENUM_TO_SLUG } = require('../config/constants')

/**
 * Generates AI-powered follow-up messages for a lead.
 * Creates WhatsApp, Call Script, and Email based on:
 * - Lead stage, temperature, budget, location
 * - Days since last contact
 * - Lead intent/status
 * 
 * No external API — context-aware, deterministic generation.
 */
async function generateFollowUpMessages(leadId, userId) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 5 },
      followUps:  { orderBy: { scheduledAt: 'desc' }, take: 3 },
    },
  })

  if (!lead) {
    const err = new Error('Lead not found.')
    err.status = 404
    throw err
  }

  // Context analysis
  const now = dayjs()
  const lastContact = lead.lastContactedAt ? dayjs(lead.lastContactedAt) : dayjs(lead.createdAt)
  const inactiveDays = now.diff(lastContact, 'day')
  
  const status = STATUS_ENUM_TO_SLUG[lead.status] || lead.status
  const temp   = TEMP_ENUM_TO_SLUG[lead.temperature] || lead.temperature
  
  // Intent classification
  let intentLabel = 'General Follow-up'
  if (status === 'new' || status === 'contacted') {
    intentLabel = 'Initial Engagement'
  } else if (status === 'qualified') {
    intentLabel = 'Qualification Discussion'
  } else if (status === 'meeting-scheduled' || status === 'site-visit-scheduled') {
    intentLabel = 'Pre-Meeting Confirmation'
  } else if (status === 'negotiation') {
    intentLabel = 'Closing Support'
  } else if (inactiveDays > 14) {
    intentLabel = 'Re-engagement'
  }

  // Generate messages
  const whatsapp = generateWhatsAppMessage(lead, status, temp, inactiveDays)
  const call     = generateCallScript(lead, status, temp, inactiveDays)
  const email    = generateEmailMessage(lead, status, temp, inactiveDays)

  // Log activity
  await prisma.activityLog.create({
    data: {
      leadId,
      type:        'AI_FOLLOWUP_GENERATED',
      description: `AI follow-up messages generated (${intentLabel})`,
      createdBy:   userId,
    },
  })

  return {
    messages: [
      { channel: 'whatsapp', label: 'WhatsApp',    tone: 'conversational', message: whatsapp },
      { channel: 'call',     label: 'Call Script', tone: 'professional',   message: call     },
      { channel: 'email',    label: 'Email',       tone: 'formal',         message: email    },
    ],
    context: { intentLabel, inactiveDays },
  }
}

// ─── Message generators ───────────────────────────────────────────────────────

function generateWhatsAppMessage(lead, status, temp, inactiveDays) {
  const name = lead.name.split(' ')[0]
  const budget = lead.budget ? `₹${(lead.budget / 10000000).toFixed(2)}Cr` : 'your budget'
  const location = lead.location?.split(',')[0] || 'your preferred area'

  if (inactiveDays > 14) {
    return `Hi ${name}! 👋

It's been a while since we last spoke. I wanted to check in — are you still looking for properties in ${location}?

I've got some great new options in your range (${budget}) that just came on the market. Would love to share them with you!

Let me know if you'd like to schedule a quick call or site visit. 🏡`
  }

  if (status === 'new' || status === 'contacted') {
    return `Hi ${name}! 👋

Thanks for connecting with us. I'm reaching out to help you find the perfect property in ${location}.

Based on your budget of ${budget}, I have some excellent options that might interest you.

When would be a good time for a quick call to understand your requirements better? 📞`
  }

  if (status === 'qualified') {
    return `Hi ${name}! 👋

Following up on our conversation. I've shortlisted a few properties in ${location} that match your requirements perfectly.

Budget: ${budget}
${lead.propertyType ? `Type: ${lead.propertyType}` : ''}

Would you be available for a site visit this weekend? I can arrange back-to-back viewings to save your time. 🏡`
  }

  if (status === 'negotiation') {
    return `Hi ${name}! 👋

Hope you're doing well. Just wanted to touch base regarding the property we discussed.

The seller is motivated and there might be room for negotiation on the price. Let me know if you'd like me to set up a call to discuss next steps.

This is a great opportunity — properties in ${location} are moving fast! 🔥`
  }

  // Default
  return `Hi ${name}! 👋

Hope all is well. I wanted to follow up on your property search in ${location}.

I have some updates that might interest you. When would be a good time for a quick catch-up call?

Looking forward to helping you find your dream home! 🏡`
}

function generateCallScript(lead, status, temp, inactiveDays) {
  const name = lead.name.split(' ')[0]
  const budget = lead.budget ? `₹${(lead.budget / 10000000).toFixed(2)} Crores` : 'their stated budget'
  const location = lead.location?.split(',')[0] || 'their preferred location'

  if (inactiveDays > 14) {
    return `OPENING:
"Hi ${name}, this is [Your Name] from Brokerra. How are you doing today?"

RECONNECTION:
"It's been a couple of weeks since we last spoke. I wanted to check in on your property search in ${location}."

VALUE PROPOSITION:
"I've come across some really interesting options in your budget range of ${budget} that I think you'll love. They're fresh listings and haven't been widely circulated yet."

CALL TO ACTION:
"Would you be available for a quick site visit this week? I can show you 2-3 properties back-to-back to make the most of your time."

HANDLE OBJECTION:
• If busy: "I completely understand. How about next weekend? I'll block time for you."
• If not interested: "No worries. May I keep you updated on new listings? The market is moving fast."

CLOSING:
"Great! I'll send you the property details on WhatsApp and we can take it from there. Sound good?"`
  }

  if (status === 'new' || status === 'contacted') {
    return `OPENING:
"Hi ${name}, this is [Your Name] from Brokerra. Is this a good time to talk for 2-3 minutes?"

INTRODUCTION:
"Thanks for connecting with us. I wanted to understand your property requirements so I can help you find exactly what you're looking for in ${location}."

DISCOVERY QUESTIONS:
• "What's driving your search right now — investment or personal use?"
• "You mentioned a budget around ${budget}. Is that flexible?"
${lead.propertyType ? `• "You're looking for ${lead.propertyType} — any specific configuration in mind?"` : '• "What type of property interests you — apartment, villa, or plot?"'}
• "Timeline-wise, when are you looking to close?"

VALUE PROPOSITION:
"Based on what you've shared, I have some great options that match your criteria. I'd love to share property details and arrange viewings."

CALL TO ACTION:
"Can I send you 2-3 shortlisted properties on WhatsApp today? Then we can schedule site visits for the ones you like."

CLOSING:
"Perfect! I'll send those over in the next hour. Looking forward to helping you find your dream property!"`
  }

  if (status === 'negotiation') {
    return `OPENING:
"Hi ${name}, this is [Your Name] from Brokerra. Hope I'm catching you at a good time?"

PURPOSE:
"I wanted to discuss the property we viewed in ${location}. Have you had time to think it over?"

REASSURANCE:
"I completely understand this is a big decision. I'm here to answer any questions and make this process as smooth as possible for you."

NEGOTIATION ANGLE:
"I've been in touch with the seller, and there might be some flexibility on the price. Would you be open to making an offer?"

CREATE URGENCY:
"Properties in this range are moving really fast in ${location}. If you're interested, I'd recommend we move quickly to secure it."

CALL TO ACTION:
"Shall I draft an offer letter and present it to the seller? We can negotiate terms that work for you."

HANDLE OBJECTION:
• If hesitant: "What are your main concerns? Let's address them together."
• If price issue: "What number would make you comfortable? Let me see what I can do."

CLOSING:
"Great! I'll get back to you with feedback from the seller within 24 hours. Sound good?"`
  }

  // Default
  return `OPENING:
"Hi ${name}, this is [Your Name] from Brokerra. How are you?"

PURPOSE:
"I wanted to follow up on your property search in ${location}. Any updates on your end?"

CHECK-IN:
"Are you still actively looking, or has anything changed with your requirements or timeline?"

VALUE ADD:
"I have some fresh listings in the ${budget} range that just came in. They're exactly the kind of properties we discussed earlier."

CALL TO ACTION:
"Would you like me to send the details on WhatsApp? We can also schedule viewings if anything catches your eye."

CLOSING:
"Perfect! I'll share those properties today and we can take it from there. Thanks for your time, ${name}!"`
}

function generateEmailMessage(lead, status, temp, inactiveDays) {
  const name = lead.name
  const budget = lead.budget ? `₹${(lead.budget / 10000000).toFixed(2)} Crores` : 'your budget range'
  const location = lead.location?.split(',')[0] || 'your preferred location'

  if (inactiveDays > 14) {
    return `Subject: Still Looking for Properties in ${location}?

Dear ${name},

I hope this email finds you well.

It's been a while since we last connected, and I wanted to reach out to see if you're still exploring property options in ${location}.

The market has been quite active recently, and I've come across several excellent listings in the ${budget} range that align with what we discussed earlier. These properties offer great value and are located in premium neighborhoods.

I'd love to reconnect and share these opportunities with you. Would you be available for a quick call this week?

Best regards,
[Your Name]
Brokerra Real Estate Solutions

P.S. If your plans have changed, no problem at all — just let me know and I'll update my records accordingly.`
  }

  if (status === 'new' || status === 'contacted') {
    return `Subject: Your Property Search in ${location} — Next Steps

Dear ${name},

Thank you for connecting with Brokerra. I'm excited to help you find the perfect property in ${location}.

Based on our initial conversation, I understand you're looking for:
• Location: ${location}
• Budget: ${budget}
${lead.propertyType ? `• Property Type: ${lead.propertyType}` : ''}

To serve you better, I'd like to schedule a brief consultation call to understand your specific requirements, preferred amenities, and timeline.

Please let me know your availability for a 15-minute call this week. I'll also start curating a shortlist of properties that match your criteria.

Looking forward to working with you!

Best regards,
[Your Name]
Senior Property Consultant
Brokerra Real Estate Solutions

📞 [Your Phone]
📧 [Your Email]`
  }

  if (status === 'negotiation') {
    return `Subject: Property Update — ${location}

Dear ${name},

I hope you're doing well.

Following up on the property viewing we had in ${location}, I wanted to share some positive news.

I've been in discussions with the seller, and they've indicated some flexibility on both the price and payment terms. This could be an excellent opportunity to close the deal on favorable terms.

Given the current market dynamics and the property's location, I believe this is a strong opportunity worth pursuing.

Would you be available for a call tomorrow to discuss this in detail? I'd like to present the full picture and help you make an informed decision.

Best regards,
[Your Name]
Senior Property Consultant
Brokerra Real Estate Solutions

P.S. Properties in this segment are moving fast — let me know if you'd like me to schedule another viewing or draft an offer letter.`
  }

  // Default
  return `Subject: Quick Update on Your Property Search

Dear ${name},

I hope this email finds you well.

I wanted to reach out with a quick update on your property search in ${location}. I've been monitoring the market closely and have identified a few new listings that match your requirements and budget of ${budget}.

These properties offer excellent value and are located in well-connected neighborhoods with good appreciation potential.

Would you like me to share the details? I can also arrange site visits at your convenience.

Please let me know how you'd like to proceed.

Best regards,
[Your Name]
Senior Property Consultant
Brokerra Real Estate Solutions

📞 [Your Phone]
📧 [Your Email]`
}

module.exports = { generateFollowUpMessages }
