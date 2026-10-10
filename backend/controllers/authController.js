const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')
require('dotenv').config()

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const [existingUser] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, passwordHash, 'USER', 'ACTIVE']
    )

    const token = jwt.sign(
      { id: result.insertId, email, role: 'USER' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    await logActivity({
      userId: result.insertId,
      action: 'USER_REGISTER',
      details: { email, name },
      ipAddress: req.ip
    })

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.insertId, name, email, role: 'USER' }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = users[0]

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    await logActivity({
      userId: user.id,
      action: 'USER_LOGIN',
      details: { email: user.email },
      ipAddress: req.ip
    })

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed' })
  }
}

const getMe = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    )

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user: users[0] })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Failed to get user information' })
  }
}

module.exports = { register, login, getMe }
