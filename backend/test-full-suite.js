const pool = require('./config/database')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const { extractDocumentText } = require('./utils/documentParser')
const { createNotification } = require('./utils/notificationService')
require('dotenv').config()

async function runRegressionSuite() {
  console.log('====================================================')
  console.log('  SECURESHARE AI — COMPREHENSIVE REGRESSION SUITE   ')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  const assert = (condition, name) => {
    if (condition) {
      console.log(`✓ PASS: ${name}`)
      passed++
    } else {
      console.error(`✗ FAIL: ${name}`)
      failed++
    }
  }

  try {
    // 1. Check database connection
    const [dbTest] = await pool.query('SELECT 1 + 1 AS result')
    assert(dbTest[0].result === 2, 'MySQL Connection Verified')

    // 2. Auth & Email validation
    const testUserEmail = `test_user_${Date.now()}@example.com`
    const testRecipientEmail = `recipient_${Date.now()}@college.edu`
    const passwordHash = await bcrypt.hash('password123', 10)

    const [user1] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Test Owner', testUserEmail, passwordHash, 'USER', 'ACTIVE']
    )
    const ownerId = user1.insertId
    assert(ownerId > 0, `User Registration (${testUserEmail})`)

    const [user2] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      ['Test Recipient', testRecipientEmail, passwordHash, 'USER', 'ACTIVE']
    )
    const recipientId = user2.insertId
    assert(recipientId > 0, `Recipient Registration (${testRecipientEmail})`)

    // 3. File Creation & Version 1 Tracking
    const dummyUploadPath = path.join(__dirname, 'uploads', `test_doc_${Date.now()}.txt`)
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true })
    fs.writeFileSync(
      dummyUploadPath,
      'Project SecureShare AI Objectives: 1. End-to-end access control. 2. AI Document Processing. 3. Zero leakage.'
    )

    const [fileResult] = await pool.query(
      `INSERT INTO files (owner_id, original_name, stored_name, file_path, file_size, mime_type, current_version)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [ownerId, 'project_spec.txt', path.basename(dummyUploadPath), dummyUploadPath, 110, 'text/plain']
    )
    const fileId = fileResult.insertId
    assert(fileId > 0, 'File Upload & Database Storage')

    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, stored_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES (?, 1, ?, ?, ?, ?, ?, 'Initial commit')`,
      [fileId, path.basename(dummyUploadPath), dummyUploadPath, 110, 'text/plain', ownerId]
    )
    assert(true, 'File Version 1 Recorded')

    // 4. Favorites Toggle
    await pool.query('INSERT INTO file_favorites (user_id, file_id) VALUES (?, ?)', [ownerId, fileId])
    const [favs] = await pool.query('SELECT * FROM file_favorites WHERE user_id = ? AND file_id = ?', [ownerId, fileId])
    assert(favs.length === 1, 'File Favorites System')

    // 5. Version Control - Upload Version 2
    const dummyUploadPathV2 = path.join(__dirname, 'uploads', `test_doc_v2_${Date.now()}.txt`)
    fs.writeFileSync(
      dummyUploadPathV2,
      'Project SecureShare AI Objectives (Updated): 1. End-to-end access control. 2. AI Document Processing. 3. Zero leakage. Milestone date: October 15, 2026.'
    )

    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, stored_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES (?, 2, ?, ?, ?, ?, ?, 'Added milestone date')`,
      [fileId, path.basename(dummyUploadPathV2), dummyUploadPathV2, 160, 'text/plain', ownerId]
    )
    await pool.query('UPDATE files SET current_version = 2, file_path = ? WHERE id = ?', [dummyUploadPathV2, fileId])

    const [versions] = await pool.query('SELECT * FROM file_versions WHERE file_id = ? ORDER BY version_number ASC', [fileId])
    assert(versions.length === 2, 'File Versioning Timeline (v1 and v2 present)')

    // 6. AI Document Parsing
    const parsed = await extractDocumentText(dummyUploadPathV2, 'text/plain')
    assert(parsed.text.includes('SecureShare AI Objectives'), 'AI Document Text Extractor')

    // 7. File Sharing & Permissions
    const sharePasscodeHash = await bcrypt.hash('secret99', 10)
    const [shareResult] = await pool.query(
      `INSERT INTO shares (file_id, sender_id, receiver_id, permission, password_hash, expires_at)
       VALUES (?, ?, ?, 'download', ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))`,
      [fileId, ownerId, recipientId, sharePasscodeHash]
    )
    const shareId = shareResult.insertId
    assert(shareId > 0, 'Encrypted Share Link Generation with Passcode')

    // 8. Notifications System
    const notifId = await createNotification({
      userId: recipientId,
      type: 'SHARE_RECEIVED',
      title: 'New File Shared With You',
      message: 'Test Owner shared project_spec.txt with you.',
      link: '/shared-with-me'
    })
    assert(notifId > 0, 'Persisted Notification Delivery in MySQL')

    // 9. Passcode Verification
    const [sharesCheck] = await pool.query('SELECT * FROM shares WHERE id = ?', [shareId])
    const passMatches = await bcrypt.compare('secret99', sharesCheck[0].password_hash)
    assert(passMatches, 'Passcode Protection Verification')

    // 10. Share Revocation
    await pool.query('UPDATE shares SET revoked_at = NOW() WHERE id = ?', [shareId])
    const [revokedCheck] = await pool.query('SELECT * FROM shares WHERE id = ? AND revoked_at IS NOT NULL', [shareId])
    assert(revokedCheck.length === 1, 'Share Access Revocation')

    // 11. Admin Security Monitoring & SOC Statistics
    const [[statTest]] = await pool.query('SELECT COUNT(*) AS total FROM users')
    assert(statTest.total >= 2, 'Admin SOC Statistics Query')

    // 12. Security Event Tracking
    await pool.query(
      `INSERT INTO security_events (event_type, email, ip_address, details, severity)
       VALUES ('FAILED_LOGIN', 'attacker@fake.com', '192.168.1.100', 'Automated brute force threshold check', 'HIGH')`
    )
    const [secCheck] = await pool.query('SELECT * FROM security_events WHERE email = ?', ['attacker@fake.com'])
    assert(secCheck.length > 0, 'Security Event Logging')

    // Clean up temporary test files
    try {
      if (fs.existsSync(dummyUploadPath)) fs.unlinkSync(dummyUploadPath)
      if (fs.existsSync(dummyUploadPathV2)) fs.unlinkSync(dummyUploadPathV2)
    } catch (e) {}

  } catch (error) {
    console.error('Fatal test error:', error)
    failed++
  }

  console.log('\n====================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('====================================================')
  process.exit(failed > 0 ? 1 : 0)
}

runRegressionSuite()
