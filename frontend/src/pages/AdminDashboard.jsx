import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const [statsRes, actRes] = await Promise.all([
        api.get('/admin/statistics'),
        api.get('/admin/activity')
      ])
      setStats(statsRes.data.statistics)
      setActivities(actRes.data.activities || [])
      setError('')
    } catch (err) {
      setError('Failed to load admin statistics and activities')
      console.error('Admin fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <div className="admin-badge">🛡️ Administrator Console</div>
          <h1>System Overview & Analytics</h1>
          <p className="page-subtitle">Real-time telemetry and management controls</p>
        </div>
        <div className="admin-actions-bar">
          <Link to="/admin/users" className="btn-admin-nav">
            👥 Manage Users
          </Link>
          <button onClick={fetchAdminData} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Gathering system statistics...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper user-bg">👥</div>
              <div className="stat-content">
                <span className="stat-label">Total Users</span>
                <span className="stat-value">{stats?.users?.total || 0}</span>
                <span className="stat-sub">{stats?.users?.active || 0} active • {stats?.users?.admins || 0} admins</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper file-bg">📁</div>
              <div className="stat-content">
                <span className="stat-label">Total Files</span>
                <span className="stat-value">{stats?.files?.total || 0}</span>
                <span className="stat-sub">{formatFileSize(stats?.files?.totalStorageBytes || 0)} used</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper share-bg">🔗</div>
              <div className="stat-content">
                <span className="stat-label">Total Shares</span>
                <span className="stat-value">{stats?.shares?.total || 0}</span>
                <span className="stat-sub">{stats?.shares?.active || 0} active links</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper audit-bg">📜</div>
              <div className="stat-content">
                <span className="stat-label">Audit Logs</span>
                <span className="stat-value">{stats?.activities?.total || 0}</span>
                <span className="stat-sub">System events recorded</span>
              </div>
            </div>
          </div>

          <div className="admin-section">
            <div className="section-header">
              <h2>🛡️ System-Wide Security & Activity Logs</h2>
              <span className="sub-text">Showing latest {activities.length} entries</span>
            </div>

            <div className="shares-table-container">
              <table className="shares-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Target File</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((act) => (
                    <tr key={act.id}>
                      <td>{formatDate(act.created_at)}</td>
                      <td>
                        {act.user_name ? (
                          <div>
                            <strong>{act.user_name}</strong>
                            <span className="sub-text">{act.user_email}</span>
                          </div>
                        ) : (
                          <span className="sub-text">System / Guest</span>
                        )}
                      </td>
                      <td>
                        <span className="badge-pill pill-default">
                          {act.action}
                        </span>
                      </td>
                      <td>
                        {act.file_name ? <span>📄 {act.file_name}</span> : <span className="sub-text">-</span>}
                      </td>
                      <td>
                        <code>{act.ip_address || '127.0.0.1'}</code>
                      </td>
                    </tr>
                  ))}
                  {activities.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                        No audit activities recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
