const pool = require('../config/database')

const logActivity = async ({ userId = null, action, fileId = null, details = null, ipAddress = null }) => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, file_id, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [
        userId,
        action,
        fileId,
        typeof details === 'object' && details !== null ? JSON.stringify(details) : details,
        ipAddress
      ]
    )
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

module.exports = { logActivity }
