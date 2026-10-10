const pool = require('../config/database')

const getActivity = async (req, res) => {
  try {
    const isGlobal = req.query.all === 'true' && req.user.role === 'ADMIN'
    
    let query = `
      SELECT 
        a.id,
        a.action,
        a.details,
        a.ip_address,
        a.created_at,
        a.user_id,
        u.name AS user_name,
        u.email AS user_email,
        f.original_name AS file_name
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN files f ON a.file_id = f.id
    `
    const params = []

    if (!isGlobal) {
      query += ` WHERE a.user_id = ?`
      params.push(req.user.id)
    }

    query += ` ORDER BY a.created_at DESC LIMIT 100`

    const [logs] = await pool.query(query, params)

    const parsedLogs = logs.map(log => {
      let parsedDetails = log.details
      try {
        if (typeof log.details === 'string' && (log.details.startsWith('{') || log.details.startsWith('['))) {
          parsedDetails = JSON.parse(log.details)
        }
      } catch (e) {
        // Keep as string
      }
      return {
        ...log,
        details: parsedDetails
      }
    })

    res.json({ activities: parsedLogs })
  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ message: 'Failed to retrieve activity log' })
  }
}

module.exports = { getActivity }
