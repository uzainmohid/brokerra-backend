const prisma = require('../config/database')
const dayjs  = require('dayjs')
const { SOURCE_ENUM_TO_SLUG, STATUS_ENUM_TO_SLUG } = require('../config/constants')

async function getAnalytics(period = '30d') {
  const days = parsePeriod(period)
  const since = dayjs().subtract(days, 'day').toDate()
  const prevSince = dayjs().subtract(days * 2, 'day').toDate()

  // Fetch all leads in parallel
  const [allLeads, periodLeads, prevLeads, closedLeads] = await Promise.all([
    prisma.lead.findMany({ select: { id: true, status: true, temperature: true, source: true, budget: true, createdAt: true, priorityScore: true } }),
    prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { id: true, status: true, temperature: true, source: true, budget: true, createdAt: true } }),
    prisma.lead.findMany({ where: { createdAt: { gte: prevSince, lt: since } }, select: { id: true, status: true, createdAt: true } }),
    prisma.lead.findMany({ where: { status: 'CLOSED' }, select: { id: true, budget: true, createdAt: true, updatedAt: true } }),
  ])

  const overview = buildOverview(allLeads, periodLeads, prevLeads, closedLeads)
  const leadsBySource = buildLeadsBySource(allLeads)
  const conversionFunnel = buildConversionFunnel(allLeads)
  const monthlyTrend = await buildMonthlyTrend()
  const revenuePotential = buildRevenuePotential(allLeads)
  const topBrokers = await buildTopBrokers()
  const leadVelocity = buildLeadVelocity(allLeads)

  return {
    overview,
    leadsBySource,
    conversionFunnel,
    monthlyTrend,
    revenuePotential,
    topPerformingBrokers: topBrokers,
    leadVelocity,
  }
}

// ─── Overview KPIs ────────────────────────────────────────────────────────────
function buildOverview(all, period, prev, closed) {
  const totalLeads  = all.length
  const hotLeads    = all.filter((l) => l.temperature === 'HOT').length
  const overdueLeads = all.filter((l) => {
    if (['CLOSED', 'LOST'].includes(l.status)) return false
    return l.priorityScore >= 30  // approximate overdue proxy
  }).length

  const today = dayjs().startOf('day').toDate()
  const todayEnd = dayjs().endOf('day').toDate()
  const todayFollowUps = all.filter((l) =>
    ['NEW', 'CONTACTED', 'FOLLOW_UP'].includes(l.status)
  ).length

  const closedCount  = all.filter((l) => l.status === 'CLOSED').length
  const conversionRate = totalLeads > 0 ? Math.round((closedCount / totalLeads) * 100 * 10) / 10 : 0

  const totalRevenuePotential = all
    .filter((l) => !['LOST'].includes(l.status))
    .reduce((sum, l) => sum + (l.budget || 0), 0)

  const avgDealValue = closedLeads => {
    const vals = closed.filter((l) => l.budget).map((l) => l.budget)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }

  const leadsThisMonth = all.filter((l) =>
    dayjs(l.createdAt).isAfter(dayjs().startOf('month'))
  ).length

  // MoM change
  const prevTotal = prev.length || 1
  const curTotal  = period.length
  const changePct = Math.round(((curTotal - prevTotal) / prevTotal) * 100)

  const prevClosed  = prev.filter((l) => l.status === 'CLOSED').length
  const prevConvRate = prev.length > 0 ? Math.round((prevClosed / prev.length) * 100 * 10) / 10 : 0
  const convChange  = Math.round(conversionRate - prevConvRate)

  return {
    totalLeads,
    hotLeads,
    overdueLeads,
    todayFollowUps: todayFollowUps,
    conversionRate,
    avgDealValue: avgDealValue(closed),
    totalRevenuePotential,
    leadsThisMonth,
    changeFromLastMonth: {
      totalLeads:     changePct,
      hotLeads:       Math.round((hotLeads - (prev.filter((l) => l.temperature === 'HOT').length)) / Math.max(prev.length, 1) * 100),
      conversionRate: convChange,
    },
  }
}

// ─── Source breakdown ─────────────────────────────────────────────────────────
function buildLeadsBySource(leads) {
  const counts = {}
  for (const lead of leads) {
    const src = SOURCE_ENUM_TO_SLUG[lead.source] || lead.source.toLowerCase()
    counts[src] = (counts[src] || 0) + 1
  }

  const total = leads.length || 1
  const colors = {
    whatsapp: '#25d366', referral: '#10b981', website: '#6366f1',
    instagram: '#e1306c', facebook: '#1877f2', 'property-portal': '#f59e0b',
    'cold-call': '#8b5cf6', 'walk-in': '#06b6d4', other: '#6b7280',
  }

  return Object.entries(counts)
    .map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / total) * 100 * 10) / 10,
      color: colors[source] || '#6b7280',
    }))
    .sort((a, b) => b.count - a.count)
}

// ─── Conversion funnel ────────────────────────────────────────────────────────
function buildConversionFunnel(leads) {
  const order = ['NEW', 'CONTACTED', 'FOLLOW_UP', 'SITE_VISIT', 'NEGOTIATION', 'CLOSED']
  const stageCounts = {}
  for (const lead of leads) {
    stageCounts[lead.status] = (stageCounts[lead.status] || 0) + 1
  }

  const total = leads.length || 1
  return order.map((status) => ({
    stage: STATUS_ENUM_TO_SLUG[status] || status.toLowerCase(),
    count: stageCounts[status] || 0,
    percentage: Math.round(((stageCounts[status] || 0) / total) * 100 * 10) / 10,
  }))
}

// ─── Monthly trend (last 6 months) ───────────────────────────────────────────
async function buildMonthlyTrend() {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const start = dayjs().subtract(i, 'month').startOf('month').toDate()
    const end   = dayjs().subtract(i, 'month').endOf('month').toDate()
    const label = dayjs().subtract(i, 'month').format('MMM YY')

    const [created, closed] = await Promise.all([
      prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { status: 'CLOSED', updatedAt: { gte: start, lte: end } } }),
    ])

    const revResult = await prisma.lead.aggregate({
      where:  { status: 'CLOSED', updatedAt: { gte: start, lte: end } },
      _sum:   { budget: true },
    })

    months.push({
      month:   label,
      leads:   created,
      closed,
      revenue: revResult._sum.budget || 0,
    })
  }
  return months
}

// ─── Revenue potential ────────────────────────────────────────────────────────
function buildRevenuePotential(leads) {
  const pipeline = {}
  for (const lead of leads) {
    const stage = STATUS_ENUM_TO_SLUG[lead.status] || lead.status
    if (!pipeline[stage]) pipeline[stage] = { pipeline: 0, realised: 0 }
    pipeline[stage].pipeline  += lead.budget || 0
    if (lead.status === 'CLOSED') pipeline[stage].realised += lead.budget || 0
  }

  return Object.entries(pipeline).map(([stage, val]) => ({
    stage,
    pipeline: val.pipeline,
    realised: val.realised,
  }))
}

// ─── Top brokers ──────────────────────────────────────────────────────────────
async function buildTopBrokers() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } })
  const results = []

  for (const user of users) {
    const closed = await prisma.lead.findMany({
      where:  { assignedTo: user.id, status: 'CLOSED' },
      select: { budget: true },
    })
    results.push({
      name:        user.name || user.email,
      closedDeals: closed.length,
      revenue:     closed.reduce((s, l) => s + (l.budget || 0), 0),
    })
  }

  return results.sort((a, b) => b.closedDeals - a.closedDeals).slice(0, 5)
}

// ─── Lead velocity (last 7 weeks) ─────────────────────────────────────────────
function buildLeadVelocity(leads) {
  const weeks = []
  for (let i = 6; i >= 0; i--) {
    const start = dayjs().subtract(i, 'week').startOf('week')
    const end   = dayjs().subtract(i, 'week').endOf('week')
    const count = leads.filter((l) =>
      dayjs(l.createdAt).isAfter(start) && dayjs(l.createdAt).isBefore(end)
    ).length
    weeks.push({ week: start.format('DD MMM'), leads: count })
  }
  return weeks
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parsePeriod(period) {
  const map = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
  return map[period] || 30
}

module.exports = { getAnalytics }
