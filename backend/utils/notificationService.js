const pool = require('../config/database')

/**
 * Creates a notification in the database for a specific user
 * @param {Object} params
 * @param {number} params.userId - Target user ID
 * @param {string} params.type - 'SHARE_RECEIVED' | 'VERSION_ADDED' | 'SHARE_EXPIRING' | 'SHARE_REVOKED' | 'DOWNLOAD_ALERT' | 'SECURITY_ALERT'
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.link] - Optional frontend route link
 */
const createNotification = async ({ userId, type, title, message, link = null }) => {
  try {
    if (!userId || !type || !title || !message) {
      console.warn('Incomplete notification data:', { userId, type, title })
      return null
    }

    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [userId, type, title, message, link]
    )

    return result.insertId
  } catch (error) {
    console.error('Failed to persist notification:', error)
    return null
  }
}

module.exports = { createNotification }
