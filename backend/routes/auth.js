const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { register, login, getMe } = require('../controllers/authController')
const { auth } = require('../middleware/auth')

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, register)

router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, login)

router.get('/me', auth, getMe)

module.exports = router
