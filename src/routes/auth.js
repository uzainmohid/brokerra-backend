const router = require('express').Router()
const { register, login } = require('../controllers/authController')
const validate = require('../middleware/validate')
const { z } = require('zod')

const registerSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name:     z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone:    z.string().optional(),
  company:  z.string().optional(),
})

const loginSchema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

router.post('/register', validate(registerSchema), register)
router.post('/login',    validate(loginSchema),    login)

module.exports = router
