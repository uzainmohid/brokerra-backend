const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../config/database')

const SALT_ROUNDS = 12

/**
 * Generate a signed JWT for a given user
 */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

/**
 * Format user object safe for sending to client (no password)
 */
function safeUser(user) {
  return {
    id:        user.id,
    email:     user.email,
    name:      user.name || null,
    role:      user.role,
    createdAt: user.createdAt,
  }
}

/**
 * Register a new user
 */
async function register({ email, password, name, phone, company }) {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    const err = new Error('An account with this email already exists.')
    err.status = 409
    throw err
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS)

  const user = await prisma.user.create({
    data: { email, password: hashed, name, phone, company },
  })

  const token = signToken(user)
  return { token, user: safeUser(user) }
}

/**
 * Login an existing user
 */
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    const err = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }

  const match = await bcrypt.compare(password, user.password)
  if (!match) {
    const err = new Error('Invalid email or password.')
    err.status = 401
    throw err
  }

  const token = signToken(user)
  return { token, user: safeUser(user) }
}

module.exports = { register, login }
