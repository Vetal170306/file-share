const pool = require('../config/database')

const getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT id, type, title, message, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    )

    const [[unreadCount]] = await pool.query(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    )

    res.json({
      notifications,
      unreadCount: unreadCount.count || 0
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ message: 'Failed to retrieve notifications' })
  }
}

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    )

    res.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ message: 'Failed to update notification' })
  }
}

const markAllAsRead = async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ?`,
      [req.user.id]
    )

    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ message: 'Failed to mark all as read' })
  }
}

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params

    await pool.query(
      `DELETE FROM notifications WHERE id = ? AND user_id = ?`,
      [id, req.user.id]
    )

    res.json({ message: 'Notification deleted' })
  } catch (error) {
    console.error('Delete notification error:', error)
    res.status(500).json({ message: 'Failed to delete notification' })
  }
}

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification }
