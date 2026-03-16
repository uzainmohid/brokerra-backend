const prisma  = require('../config/database')
const dayjs   = require('dayjs')
const { STATUS_ENUM_TO_SLUG, TEMP_ENUM_TO_SLUG, SOURCE_ENUM_TO_SLUG } = require('../config/constants')

// ─── CSV Export ───────────────────────────────────────────────────────────────

async function exportLeadsCsv() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const rows = leads.map((l) => ({
    ID:           l.id,
    Name:         l.name,
    Phone:        l.phone,
    Email:        l.email || '',
    Status:       STATUS_ENUM_TO_SLUG[l.status] || l.status,
    Temperature:  TEMP_ENUM_TO_SLUG[l.temperature] || l.temperature,
    Source:       SOURCE_ENUM_TO_SLUG[l.source] || l.source,
    Budget:       l.budget ? `${(l.budget / 100000).toFixed(1)}L` : '',
    'Property Type': l.propertyType || '',
    Location:     l.location || '',
    'Priority Score': l.priorityScore || 0,
    'Is Hot Lead':    l.isHotLead ? 'Yes' : 'No',
    'Is Overdue':     l.isOverdue  ? 'Yes' : 'No',
    Tags:         (l.tags || []).join(' | '),
    Notes:        (l.noteText || '').replace(/\n/g, ' '),
    'Created At': dayjs(l.createdAt).format('DD-MM-YYYY HH:mm'),
    'Last Follow-Up': l.lastFollowUp ? dayjs(l.lastFollowUp).format('DD-MM-YYYY') : '',
    'Next Follow-Up': l.nextFollowUpAt ? dayjs(l.nextFollowUpAt).format('DD-MM-YYYY') : '',
  }))

  return buildCsv(rows)
}

// ─── Monthly Report ────────────────────────────────────────────────────────────

async function getMonthlyReport() {
  const monthStart = dayjs().startOf('month').toDate()
  const monthEnd   = dayjs().endOf('month').toDate()

  const [total, byStatus, revResult, hotLeads, newLeads] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: monthStart, lte: monthEnd } } }),
    prisma.lead.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.lead.aggregate({
      where: { status: 'CLOSED', updatedAt: { gte: monthStart, lte: monthEnd } },
      _sum:  { budget: true },
    }),
    prisma.lead.count({ where: { temperature: 'HOT' } }),
    prisma.lead.count({ where: { status: 'NEW', createdAt: { gte: monthStart, lte: monthEnd } } }),
  ])

  const closedCount = byStatus.find((s) => s.status === 'CLOSED')?._count.id || 0
  const revPotential = await prisma.lead.aggregate({
    where: { status: { notIn: ['LOST', 'CLOSED'] } },
    _sum:  { budget: true },
  })

  const allLeads = await prisma.lead.findMany({
    select: { budget: true, status: true, temperature: true, source: true },
  })

  const convRate = allLeads.length > 0
    ? ((allLeads.filter((l) => l.status === 'CLOSED').length / allLeads.length) * 100).toFixed(1)
    : '0.0'

  return {
    reportMonth:       dayjs().format('MMMM YYYY'),
    generatedAt:       new Date().toISOString(),
    totalLeadsThisMonth: total,
    newLeadsThisMonth:   newLeads,
    closedDealsThisMonth: closedCount,
    revenueRealised:   revResult._sum.budget || 0,
    revenuePotential:  revPotential._sum.budget || 0,
    hotLeads,
    conversionRate:    parseFloat(convRate),
    pipelineSummary:   byStatus.map((s) => ({
      status: STATUS_ENUM_TO_SLUG[s.status] || s.status,
      count:  s._count.id,
    })),
  }
}

// ─── Pipeline CSV Export ───────────────────────────────────────────────────────

async function exportPipelineCsv() {
  const leads = await prisma.lead.findMany({
    where:   { status: { notIn: ['CLOSED', 'LOST'] } },
    orderBy: { priorityScore: 'desc' },
  })

  const rows = leads.map((l) => ({
    Name:          l.name,
    Phone:         l.phone,
    Status:        STATUS_ENUM_TO_SLUG[l.status] || l.status,
    Temperature:   TEMP_ENUM_TO_SLUG[l.temperature] || l.temperature,
    Budget:        l.budget ? `${(l.budget / 100000).toFixed(1)}L` : '',
    'Priority Score': l.priorityScore || 0,
    Location:      l.location || '',
    'Property Type': l.propertyType || '',
    'Days in Pipeline': dayjs().diff(dayjs(l.createdAt), 'day'),
  }))

  return buildCsv(rows)
}

// ─── CSV builder ──────────────────────────────────────────────────────────────

function buildCsv(rows) {
  if (!rows.length) return 'No data available.\n'
  const headers = Object.keys(rows[0])
  const lines   = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h] == null ? '' : String(row[h])
        // Escape commas and quotes
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val
      }).join(',')
    ),
  ]
  return lines.join('\n')
}

module.exports = { exportLeadsCsv, getMonthlyReport, exportPipelineCsv }
