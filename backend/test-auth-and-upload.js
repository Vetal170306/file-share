const pool = require('./config/database')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

// Mock Express validation logic matching backend/routes/auth.js
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const testEmails = [
  { email: 'prathmesh@gmail.com', expected: true },
  { email: 'student@college.edu', expected: true },
  { email: 'test.name@example.com', expected: true },
  { email: 'user+test@gmail.com', expected: true },
  { email: 'abc@yahoo.com', expected: true },
  { email: '  spaced.user@example.com  ', expected: true },
  { email: 'prathmesh', expected: false },
  { email: 'prathmesh@', expected: false },
  { email: '@gmail.com', expected: false },
  { email: 'prathmesh@gmail', expected: false },
  { email: '', expected: false }
]

async function runTests() {
  console.log('=== Running Email Validation & Database Tests ===\n')

  let passed = 0
  let failed = 0

  for (const t of testEmails) {
    const trimmed = t.email.trim()
    const isValid = trimmed.length > 0 && emailRegex.test(trimmed)
    if (isValid === t.expected) {
      console.log(`✓ PASS: "${t.email}" -> Valid: ${isValid} (Expected: ${t.expected})`)
      passed++
    } else {
      console.error(`✗ FAIL: "${t.email}" -> Valid: ${isValid} (Expected: ${t.expected})`)
      failed++
    }
  }

  // Test admin user in MySQL
  console.log('\n=== Testing Default Admin in Database ===')
  const [admins] = await pool.query('SELECT id, name, email, password_hash, role, status FROM users WHERE email = ?', ['admin@securefile.com'])
  if (admins.length > 0) {
    const admin = admins[0]
    const isMatch = await bcrypt.compare('admin123', admin.password_hash)
    console.log(`✓ Admin user found: ${admin.name} (${admin.email})`)
    console.log(`✓ Admin role: ${admin.role}, status: ${admin.status}`)
    console.log(`✓ Password match for 'admin123': ${isMatch}`)
  } else {
    console.error('✗ Admin user not found!')
    failed++
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

runTests()
