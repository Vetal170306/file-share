import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import './AdminDashboard.css'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [activities, setActivities] = useState([])
  const [securityEvents, setSecurityEvents] = useState([])
  const [activeTab, setActiveTab] = useState('security') // 'security' | 'activity'
  const [severityFilter, setSeverityFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAdminData()
  }, [])

  const fetchAdminData = async () => {
    try {
      setLoading(true)
      const [statsRes, actRes, secRes] = await Promise.all([
        api.get('/admin/statistics'),
        api.get('/admin/activity'),
        api.get('/admin/security-events')
      ])
      setStats(statsRes.data.statistics)
      setActivities(actRes.data.activities || [])
      setSecurityEvents(secRes.data.events || [])
      setError('')
    } catch (err) {
      setError('Failed to load admin security center data')
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

  const filteredEvents = securityEvents.filter(ev => {
    if (severityFilter === 'all') return true
    return ev.severity === severityFilter
  })

  return (
    <div className="admin-page">
      {/* Top Header */}
      <div className="admin-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-warning">🛡️ SOC & Security Center</span>
            <span className="file-count-indicator">Role: System Administrator</span>
          </div>
          <h1 className="page-heading">Admin Security & Telemetry</h1>
          <p className="page-sub">Real-time threat monitoring, failed login tracking, and global access audits</p>
        </div>
        <div className="admin-actions-bar">
          <Link to="/admin/users" className="btn-primary btn-sm">
            👥 User Management & RBAC
          </Link>
          <button onClick={fetchAdminData} className="btn-secondary btn-sm">
            🔄 Refresh Metrics
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}

      {loading ? (
        <div className="admin-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Compiling database security telemetry...</p>
        </div>
      ) : (
        <>
          {/* Top KPI Grid */}
          <div className="admin-kpi-grid">
            <div className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                👥
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats?.users?.total || 0}</span>
                <span className="kpi-label">Registered Accounts</span>
                <span className="kpi-sub-text">{stats?.users?.active || 0} active • {stats?.users?.suspended || 0} suspended</span>
              </div>
            </div>

            <div className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                📁
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats?.files?.total || 0}</span>
                <span className="kpi-label">Encrypted Files</span>
                <span className="kpi-sub-text">{formatFileSize(stats?.files?.totalStorageBytes || 0)} storage</span>
              </div>
            </div>

            <div className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                🔗
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats?.shares?.total || 0}</span>
                <span className="kpi-label">Share Links</span>
                <span className="kpi-sub-text">{stats?.shares?.active || 0} active • {stats?.shares?.passwordProtected || 0} passcode</span>
              </div>
            </div>

            <div className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e' }}>
                🛡️
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats?.security?.events24h || 0}</span>
                <span className="kpi-label">Security Alerts (24h)</span>
                <span className="kpi-sub-text">{stats?.security?.totalEvents || 0} total events logged</span>
              </div>
            </div>
          </div>

          {/* Storage Distribution Visual */}
          {stats?.files?.breakdown?.length > 0 && (
            <div className="storage-dist-card glass-card">
              <h3 className="section-title">📦 Global Storage Distribution by File Type</h3>
              <div className="breakdown-pills-row">
                {stats.files.breakdown.map((b, i) => (
                  <div key={i} className="storage-type-pill">
                    <span className="pill-type-name">{b.category}</span>
                    <span className="pill-type-val">{formatFileSize(b.total_bytes)} ({b.count} files)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security Tabs & Tables */}
          <div className="admin-logs-card glass-card">
            <div className="admin-tabs-row">
              <div className="tab-buttons-group">
                <button
                  className={`admin-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  🛡️ Security Alerts & Failed Logins ({securityEvents.length})
                </button>
                <button
                  className={`admin-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  📜 System Audit Trail ({activities.length})
                </button>
              </div>

              {activeTab === 'security' && (
                <div className="severity-filter-group">
                  <span className="filter-label">Severity:</span>
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="severity-dropdown"
                  >
                    <option value="all">All Severities</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              )}
            </div>

            {activeTab === 'security' ? (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Event Type</th>
                      <th>Account / Email</th>
                      <th>Severity</th>
                      <th>Details</th>
                      <th>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(ev => (
                      <tr key={ev.id}>
                        <td>{formatDate(ev.created_at)}</td>
                        <td>
                          <span className="event-type-badge">{ev.event_type}</span>
                        </td>
                        <td>
                          <strong>{ev.email || 'Anonymous'}</strong>
                        </td>
                        <td>
                          <span className={`badge ${
                            ev.severity === 'CRITICAL' ? 'badge-danger' :
                            ev.severity === 'HIGH' ? 'badge-danger' :
                            ev.severity === 'MEDIUM' ? 'badge-warning' : 'badge-brand'
                          }`}>
                            {ev.severity}
                          </span>
                        </td>
                        <td className="event-details-cell">{ev.details || '-'}</td>
                        <td><code>{ev.ip_address || '127.0.0.1'}</code></td>
                      </tr>
                    ))}
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan="6" className="table-empty-td">
                          No security events recorded under this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
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
                    {activities.map(act => (
                      <tr key={act.id}>
                        <td>{formatDate(act.created_at)}</td>
                        <td>
                          {act.user_name ? (
                            <div>
                              <strong>{act.user_name}</strong>
                              <span className="meta-sub">{act.user_email}</span>
                            </div>
                          ) : (
                            <span className="meta-sub">System / Automated</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-brand">{act.action}</span>
                        </td>
                        <td>{act.file_name ? `📄 ${act.file_name}` : '-'}</td>
                        <td><code>{act.ip_address || '127.0.0.1'}</code></td>
                      </tr>
                    ))}
                    {activities.length === 0 && (
                      <tr>
                        <td colSpan="5" className="table-empty-td">
                          No audit activity entries logged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default AdminDashboard
