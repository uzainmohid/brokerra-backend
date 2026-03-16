const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Brokerra database...')

  // ── Create demo user ──────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('demo1234', 12)

  const user = await prisma.user.upsert({
    where: { email: 'demo@brokerra.in' },
    update: {},
    create: {
      email: 'demo@brokerra.in',
      password: hashedPassword,
      name: 'Rajesh Sharma',
      phone: '+91 98765 00000',
      company: 'Prime Properties Mumbai',
      role: 'broker',
    },
  })

  console.log(`✅ Demo user created: ${user.email}`)

  // ── Create demo leads ─────────────────────────────────────────────────────
  const leads = [
    {
      name: 'Amit Kapoor',
      phone: '+91 98765 43210',
      email: 'amit.k@gmail.com',
      budget: 18500000,
      source: 'REFERRAL',
      status: 'NEGOTIATION',
      temperature: 'HOT',
      propertyType: '3BHK Apartment',
      location: 'Bandra West, Mumbai',
      noteText: 'Interested in sea-facing unit. Needs parking. Decision by month end.',
      assignedTo: user.id,
      priorityScore: 85,
      isHotLead: true,
      lastFollowUp: new Date(Date.now() - 1000 * 60 * 60 * 48),
      nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
    {
      name: 'Priya Mehta',
      phone: '+91 87654 32109',
      email: 'priya.m@email.com',
      budget: 9500000,
      source: 'INSTAGRAM',
      status: 'SITE_VISIT',
      temperature: 'HOT',
      propertyType: '2BHK Lake View',
      location: 'Powai, Mumbai',
      noteText: 'Site visit scheduled. Very engaged. Second visit likely.',
      assignedTo: user.id,
      priorityScore: 78,
      isHotLead: true,
      lastFollowUp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
    },
    {
      name: 'Sunita Rao',
      phone: '+91 76543 21098',
      budget: 12200000,
      source: 'WHATSAPP',
      status: 'FOLLOW_UP',
      temperature: 'WARM',
      propertyType: '3BHK',
      location: 'Andheri West, Mumbai',
      noteText: 'Follow-up overdue. Was interested in Andheri listing.',
      assignedTo: user.id,
      priorityScore: 65,
      isHotLead: false,
      isOverdue: true,
      lastFollowUp: new Date(Date.now() - 1000 * 60 * 60 * 96),
      nextFollowUpAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
    {
      name: 'Vikram Nair',
      phone: '+91 65432 10987',
      budget: 7800000,
      source: 'PROPERTY_PORTAL',
      status: 'CONTACTED',
      temperature: 'WARM',
      propertyType: '2BHK',
      location: 'Thane West',
      assignedTo: user.id,
      priorityScore: 45,
      lastFollowUp: new Date(Date.now() - 1000 * 60 * 60 * 72),
    },
    {
      name: 'Mohammed Riyaz',
      phone: '+91 54321 09876',
      budget: 5500000,
      source: 'COLD_CALL',
      status: 'NEW',
      temperature: 'COLD',
      location: 'Navi Mumbai',
      assignedTo: user.id,
      priorityScore: 20,
    },
    {
      name: 'Kavita Desai',
      phone: '+91 43210 98765',
      email: 'kavita.d@gmail.com',
      budget: 15000000,
      source: 'REFERRAL',
      status: 'CLOSED',
      temperature: 'HOT',
      propertyType: '4BHK',
      location: 'Juhu, Mumbai',
      assignedTo: user.id,
      priorityScore: 95,
      isHotLead: true,
      lastFollowUp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  ]

  for (const leadData of leads) {
    const lead = await prisma.lead.create({ data: leadData })

    // Create activity log for each lead
    await prisma.activityLog.create({
      data: {
        leadId: lead.id,
        type: 'CREATED',
        description: `Lead created — ${lead.name}`,
        createdBy: 'System',
      },
    })

    console.log(`  ✅ Lead created: ${lead.name}`)
  }

  console.log('\n🎉 Seed complete!')
  console.log('   Login: demo@brokerra.in / demo1234')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
