const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')
const { createNotification } = require('../utils/notificationService')

const getUsers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null
    const roleFilter = req.query.role || null
    const statusFilter = req.query.status || null

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.created_at,
        COUNT(DISTINCT f.id) AS file_count,
        COALESCE(SUM(f.file_size), 0) AS storage_used,
        (SELECT MAX(a.created_at) FROM activity_logs a WHERE a.user_id = u.id) AS last_active_at
      FROM users u
      LEFT JOIN files f ON u.id = f.owner_id
    `
    const conditions = []
    const params = []

    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)')
      params.push(search, search)
    }

    if (roleFilter && ['USER', 'ADMIN'].includes(roleFilter)) {
      conditions.push('u.role = ?')
      params.push(roleFilter)
    }

    if (statusFilter && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(statusFilter)) {
      conditions.push('u.status = ?')
      params.push(statusFilter)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`

    const [users] = await pool.query(query, params)
    res.json({ users })
  } catch (error) {
    console.error('Admin get users error:', error)
    res.status(500).json({ message: 'Failed to retrieve users' })
  }
}

const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, role } = req.body
    const targetUserId = parseInt(id, 10)

    if (targetUserId === req.user.id && (status === 'INACTIVE' || status === 'SUSPENDED')) {
      return res.status(400).json({ message: 'You cannot deactivate or suspend your own administrator account' })
    }

    // Prevent changing role of the last active admin
    if (role === 'USER') {
      const [[adminCount]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'`)
      if (adminCount.count <= 1 && targetUserId === req.user.id) {
        return res.status(400).json({ message: 'Cannot demote the last remaining active administrator' })
      }
    }

    const updates = []
    const params = []

    if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
      updates.push('status = ?')
      params.push(status)
    }

    if (role && ['USER', 'ADMIN'].includes(role)) {
      updates.push('role = ?')
      params.push(role)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }

    params.push(targetUserId)

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    await logActivity({
      userId: req.user.id,
      action: 'ADMIN_USER_UPDATE',
      details: { targetUserId, updatedFields: { status, role } },
      ipAddress: req.ip
    })

    if (status === 'SUSPENDED' || status === 'INACTIVE') {
      await pool.query(
        `INSERT INTO security_events (event_type, email, ip_address, details, severity)
         SELECT 'SESSION_REVOKED', email, ?, ?, 'MEDIUM' FROM users WHERE id = ?`,
        [req.ip, `Account status changed to ${status} by admin`, targetUserId]
      )
    }

    res.json({ message: 'User account updated successfully' })
  } catch (error) {
    console.error('Admin update user error:', error)
    res.status(500).json({ message: 'Failed to update user' })
  }
}

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const targetUserId = parseInt(id, 10)

    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' })
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [targetUserId])
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const targetUser = users[0]
    if (targetUser.role === 'ADMIN') {
      const [[adminCount]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'`)
      if (adminCount.count <= 1) {
        return res.status(400).json({ message: 'Cannot delete the only administrator' })
      }
    }

    await pool.query('DELETE FROM users WHERE id = ?', [targetUserId])

    await logActivity({
      userId: req.user.id,
      action: 'ADMIN_USER_DELETE',
      details: { deletedUserId: targetUserId, email: targetUser.email },
      ipAddress: req.ip
    })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Admin delete user error:', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
}

const getStatistics = async (req, res) => {
  try {
    const [[userStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_users,
        SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) AS suspended_users,
        SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) AS inactive_users,
        SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS admin_users
      FROM users
    `)

    const [[fileStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_files,
        COALESCE(SUM(file_size), 0) AS total_storage
      FROM files
    `)

    const [storageBreakdown] = await pool.query(`
      SELECT 
        CASE 
          WHEN mime_type LIKE '%pdf%' THEN 'PDF'
          WHEN mime_type LIKE '%image%' THEN 'Images'
          WHEN mime_type LIKE '%word%' OR mime_type LIKE '%document%' THEN 'Documents'
          WHEN mime_type LIKE '%excel%' OR mime_type LIKE '%spreadsheet%' THEN 'Spreadsheets'
          WHEN mime_type LIKE '%video%' THEN 'Video'
          WHEN mime_type LIKE '%audio%' THEN 'Audio'
          WHEN mime_type LIKE '%zip%' OR mime_type LIKE '%compressed%' THEN 'Archives'
          ELSE 'Others'
        END AS category,
        COUNT(*) AS count,
        SUM(file_size) AS total_bytes
      FROM files
      GROUP BY category
      ORDER BY total_bytes DESC
    `)

    const [[shareStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_shares,
        SUM(CASE WHEN revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 ELSE 0 END) AS active_shares,
        SUM(CASE WHEN revoked_at IS NOT NULL THEN 1 ELSE 0 END) AS revoked_shares,
        SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= NOW() AND revoked_at IS NULL THEN 1 ELSE 0 END) AS expired_shares,
        SUM(CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END) AS password_protected_shares
      FROM shares
    `)

    const [[secStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_events,
        SUM(CASE WHEN created_at >= NOW() - INTERVAL 24 HOUR THEN 1 ELSE 0 END) AS events_24h,
        SUM(CASE WHEN severity = 'HIGH' OR severity = 'CRITICAL' THEN 1 ELSE 0 END) AS critical_events
      FROM security_events
    `)

    res.json({
      statistics: {
        users: {
          total: userStats.total_users || 0,
          active: userStats.active_users || 0,
          suspended: userStats.suspended_users || 0,
          inactive: userStats.inactive_users || 0,
          admins: userStats.admin_users || 0
        },
        files: {
          total: fileStats.total_files || 0,
          totalStorageBytes: fileStats.total_storage || 0,
          breakdown: storageBreakdown || []
        },
        shares: {
          total: shareStats.total_shares || 0,
          active: shareStats.active_shares || 0,
          revoked: shareStats.revoked_shares || 0,
          expired: shareStats.expired_shares || 0,
          passwordProtected: shareStats.password_protected_shares || 0
        },
        security: {
          totalEvents: secStats.total_events || 0,
          events24h: secStats.events_24h || 0,
          criticalEvents: secStats.critical_events || 0
        }
      }
    })
  } catch (error) {
    console.error('Admin statistics error:', error)
    res.status(500).json({ message: 'Failed to retrieve system statistics' })
  }
}

const getSecurityEvents = async (req, res) => {
  try {
    const severity = req.query.severity || null
    const eventType = req.query.type || null
    const search = req.query.search ? `%${req.query.search.trim()}%` : null

    let query = `SELECT * FROM security_events`
    const conditions = []
    const params = []

    if (severity) {
      conditions.push('severity = ?')
      params.push(severity)
    }

    if (eventType) {
      conditions.push('event_type = ?')
      params.push(eventType)
    }

    if (search) {
      conditions.push('(email LIKE ? OR ip_address LIKE ? OR details LIKE ?)')
      params.push(search, search, search)
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }

    query += ` ORDER BY created_at DESC LIMIT 100`

    const [events] = await pool.query(query, params)
    res.json({ events })
  } catch (error) {
    console.error('Admin security events error:', error)
    res.status(500).json({ message: 'Failed to retrieve security events' })
  }
}

const getAdminActivity = async (req, res) => {
  try {
    const [activities] = await pool.query(`
      SELECT 
        a.id,
        a.action,
        a.details,
        a.ip_address,
        a.created_at,
        u.id AS user_id,
        u.name AS user_name,
        u.email AS user_email,
        f.id AS file_id,
        f.original_name AS file_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN files f ON a.file_id = f.id
      ORDER BY a.created_at DESC
      LIMIT 150
    `)

    res.json({ activities })
  } catch (error) {
    console.error('Admin activity logs error:', error)
    res.status(500).json({ message: 'Failed to retrieve admin activity' })
  }
}

module.exports = {
  getUsers,
  updateUserStatus,
  deleteUser,
  getStatistics,
  getSecurityEvents,
  getAdminActivity
}
