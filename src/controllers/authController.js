const authService = require('../services/authService')
const { ok, fail } = require('../utils/response')

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body)
    ok(res, result, 'Account created successfully.', 201)
  } catch (err) {
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body)
    ok(res, result, 'Login successful.')
  } catch (err) {
    next(err)
  }
}

module.exports = { register, login }
