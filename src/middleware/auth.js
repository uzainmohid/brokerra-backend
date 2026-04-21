// const jwt = require('jsonwebtoken')
// const prisma = require('../config/database')

// const auth = async (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return res.status(401).json({ success: false, message: 'Access denied. No token provided.' })
//     }

//     const token = authHeader.split(' ')[1]
//     const decoded = jwt.verify(token, process.env.JWT_SECRET)

//     const user = await prisma.user.findUnique({
//       where: { id: decoded.id },
//       select: { id: true, email: true, name: true, role: true },
//     })

//     if (!user) {
//       return res.status(401).json({ success: false, message: 'Token invalid — user not found.' })
//     }

//     req.user = user
//     next()
//   } catch (err) {
//     if (err.name === 'JsonWebTokenError') {
//       return res.status(401).json({ success: false, message: 'Invalid token.' })
//     }
//     if (err.name === 'TokenExpiredError') {
//       return res.status(401).json({ success: false, message: 'Token expired.' })
//     }
//     next(err)
//   }
// }

// module.exports = auth



const jwt = require('jsonwebtoken')
const prisma = require('../config/database')

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // ✅ FIX: support both id and userId
    const userId = decoded.id || decoded.userId

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      })
    }

    req.user = user   // ✅ IMPORTANT
    next()

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    })
  }
}

module.exports = auth