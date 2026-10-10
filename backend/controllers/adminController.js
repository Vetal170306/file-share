const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')

const getUsers = async (req, res) => {
  try {
    const search = req.query.search ? `%${req.query.search.trim()}%` : null
    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.status, 
        u.created_at,
        COUNT(DISTINCT f.id) AS file_count,
        COALESCE(SUM(f.file_size), 0) AS storage_used
      FROM users u
      LEFT JOIN files f ON u.id = f.owner_id
    `
    const params = []

    if (search) {
      query += ` WHERE u.name LIKE ? OR u.email LIKE ?`
      params.push(search, search)
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
      return res.status(400).json({ message: 'You cannot deactivate or suspend your own account' })
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

    res.json({ message: 'User updated successfully' })
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

    await pool.query('DELETE FROM users WHERE id = ?', [targetUserId])

    await logActivity({
      userId: req.user.id,
      action: 'ADMIN_USER_DELETE',
      details: { deletedUserId: targetUserId, email: users[0].email },
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
        SUM(CASE WHEN role = 'ADMIN' THEN 1 ELSE 0 END) AS admin_users
      FROM users
    `)

    const [[fileStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_files,
        COALESCE(SUM(file_size), 0) AS total_storage
      FROM files
    `)

    const [[shareStats]] = await pool.query(`
      SELECT 
        COUNT(*) AS total_shares,
        SUM(CASE WHEN revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 ELSE 0 END) AS active_shares
      FROM shares
    `)

    const [[activityStats]] = await pool.query(`
      SELECT COUNT(*) AS total_activities FROM activity_logs
    `)

    res.json({
      statistics: {
        users: {
          total: userStats.total_users || 0,
          active: userStats.active_users || 0,
          admins: userStats.admin_users || 0
        },
        files: {
          total: fileStats.total_files || 0,
          totalStorageBytes: fileStats.total_storage || 0
        },
        shares: {
          total: shareStats.total_shares || 0,
          active: shareStats.active_shares || 0
        },
        activities: {
          total: activityStats.total_activities || 0
        }
      }
    })
  } catch (error) {
    console.error('Admin statistics error:', error)
    res.status(500).json({ message: 'Failed to retrieve system statistics' })
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

module.exports = { getUsers, updateUserStatus, deleteUser, getStatistics, getAdminActivity }
