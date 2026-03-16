const { PrismaClient } = require('@prisma/client')

let prisma

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient()
} else {
  // Prevent hot-reload from creating multiple connections in dev
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['warn', 'error'],
    })
  }
  prisma = global.__prisma
}

module.exports = prisma
