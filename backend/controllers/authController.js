const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')
require('dotenv').config()

const register = async (req, res) => {
  try {
    let { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    name = name.trim()
    email = email.trim().toLowerCase()

    const [existingUser] = await pool.query(
      'SELECT id, password_hash, role FROM users WHERE email = ?',
      [email]
    )

    let userId
    let userRole = 'USER'
    let isClaimedInvite = false

    if (existingUser.length > 0) {
      const userRecord = existingUser[0]
      // Check if user was auto-provisioned via share invite
      if (userRecord.password_hash && userRecord.password_hash.startsWith('$INVITED$')) {
        const passwordHash = await bcrypt.hash(password, 10)
        await pool.query(
          'UPDATE users SET name = ?, password_hash = ?, status = ? WHERE id = ?',
          [name, passwordHash, 'ACTIVE', userRecord.id]
        )
        userId = userRecord.id
        userRole = userRecord.role || 'USER'
        isClaimedInvite = true
      } else {
        return res.status(400).json({ message: 'Email already registered' })
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 10)
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
        [name, email, passwordHash, 'USER', 'ACTIVE']
      )
      userId = result.insertId
    }

    const token = jwt.sign(
      { id: userId, email, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    await logActivity({
      userId,
      action: isClaimedInvite ? 'USER_CLAIM_INVITE' : 'USER_REGISTER',
      details: { email, name, isClaimedInvite },
      ipAddress: req.ip
    })

    res.status(201).json({
      message: isClaimedInvite
        ? 'Account activated successfully! Any shared files are now accessible in Shared With Me.'
        : 'User registered successfully',
      token,
      user: { id: userId, name, email, role: userRole }
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed' })
  }
}

const login = async (req, res) => {
  try {
    let { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    email = email.trim().toLowerCase()

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )

    if (users.length === 0) {
      await pool.query(
        `INSERT INTO security_events (event_type, email, ip_address, details, severity) 
         VALUES ('FAILED_LOGIN', ?, ?, 'Non-existent account login attempt', 'MEDIUM')`,
        [email, req.ip]
      )
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = users[0]

    if (user.password_hash && user.password_hash.startsWith('$INVITED$')) {
      return res.status(401).json({
        message: 'This email received a shared file invitation. Please use the Register page to set your password and access your files.'
      })
    }

    if (user.status !== 'ACTIVE') {
      await pool.query(
        `INSERT INTO security_events (event_type, email, ip_address, details, severity) 
         VALUES ('BLOCKED_LOGIN_ATTEMPT', ?, ?, ?, 'HIGH')`,
        [email, req.ip, `Login attempt on ${user.status} account`]
      )
      return res.status(403).json({ message: `Account is ${user.status.toLowerCase()}` })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      await pool.query(
        `INSERT INTO security_events (event_type, email, ip_address, details, severity) 
         VALUES ('FAILED_LOGIN', ?, ?, 'Incorrect password provided', 'MEDIUM')`,
        [email, req.ip]
      )
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
