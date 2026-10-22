const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const { register, login, getMe } = require('../controllers/authController')
const { auth } = require('../middleware/auth')

const validateRequest = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorList = errors.array()
    return res.status(400).json({ 
      message: errorList[0].msg,
      errors: errorList 
    })
  }
  next()
}

// Standard email validation regex supporting normal and plus-addressing emails
const emailValidator = body('email')
  .trim()
  .notEmpty().withMessage('Email address is required')
  .isEmail().withMessage('Please enter a valid email address')

router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  emailValidator,
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, register)

router.post('/login', [
  emailValidator,
  body('password').notEmpty().withMessage('Password is required')
], validateRequest, login)

router.get('/me', auth, getMe)

module.exports = router
