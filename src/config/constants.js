// ─── Lead Status (matches frontend exactly) ───────────────────────────────────
const LEAD_STATUS = {
  NEW:         'NEW',
  CONTACTED:   'CONTACTED',
  FOLLOW_UP:   'FOLLOW_UP',
  SITE_VISIT:  'SITE_VISIT',
  NEGOTIATION: 'NEGOTIATION',
  CLOSED:      'CLOSED',
  LOST:        'LOST',
}

// Maps from frontend slug → DB enum value
const STATUS_SLUG_TO_ENUM = {
  'new':         'NEW',
  'contacted':   'CONTACTED',
  'follow-up':   'FOLLOW_UP',
  'site-visit':  'SITE_VISIT',
  'negotiation': 'NEGOTIATION',
  'closed':      'CLOSED',
  'lost':        'LOST',
}

// Maps from DB enum → frontend slug
const STATUS_ENUM_TO_SLUG = {
  'NEW':         'new',
  'CONTACTED':   'contacted',
  'FOLLOW_UP':   'follow-up',
  'SITE_VISIT':  'site-visit',
  'NEGOTIATION': 'negotiation',
  'CLOSED':      'closed',
  'LOST':        'lost',
}

// ─── Lead Temperature ─────────────────────────────────────────────────────────
const LEAD_TEMPERATURE = { HOT: 'HOT', WARM: 'WARM', COLD: 'COLD' }

const TEMP_SLUG_TO_ENUM = { 'hot': 'HOT', 'warm': 'WARM', 'cold': 'COLD' }
const TEMP_ENUM_TO_SLUG = { 'HOT': 'hot', 'WARM': 'warm', 'COLD': 'cold' }

// ─── Lead Source ──────────────────────────────────────────────────────────────
const SOURCE_SLUG_TO_ENUM = {
  'whatsapp':        'WHATSAPP',
  'referral':        'REFERRAL',
  'website':         'WEBSITE',
  'instagram':       'INSTAGRAM',
  'facebook':        'FACEBOOK',
  'property-portal': 'PROPERTY_PORTAL',
  'cold-call':       'COLD_CALL',
  'walk-in':         'WALK_IN',
  'other':           'OTHER',
}

const SOURCE_ENUM_TO_SLUG = {
  'WHATSAPP':        'whatsapp',
  'REFERRAL':        'referral',
  'WEBSITE':         'website',
  'INSTAGRAM':       'instagram',
  'FACEBOOK':        'facebook',
  'PROPERTY_PORTAL': 'property-portal',
  'COLD_CALL':       'cold-call',
  'WALK_IN':         'walk-in',
  'OTHER':           'other',
}

// ─── Priority scoring weights ─────────────────────────────────────────────────
const SCORE_WEIGHTS = {
  BUDGET_1CR_PLUS:  40,
  BUDGET_50L_PLUS:  20,
  BUDGET_20L_PLUS:  10,
  OVERDUE_FOLLOWUP: 30,
  NEW_LEAD:         10,
  HOT_TEMP:         15,
  WARM_TEMP:         5,
  NEGOTIATION:      20,
  SITE_VISIT:       15,
  CONTACTED:         5,
}

module.exports = {
  LEAD_STATUS,
  STATUS_SLUG_TO_ENUM,
  STATUS_ENUM_TO_SLUG,
  LEAD_TEMPERATURE,
  TEMP_SLUG_TO_ENUM,
  TEMP_ENUM_TO_SLUG,
  SOURCE_SLUG_TO_ENUM,
  SOURCE_ENUM_TO_SLUG,
  SCORE_WEIGHTS,
}
