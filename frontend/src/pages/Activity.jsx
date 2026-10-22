import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Activity.css'

const Activity = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const res = await api.get('/activity')
      setActivities(res.data.activities || [])
      setError('')
    } catch (err) {
      setError('Failed to load activity logs')
      console.error('Fetch activity error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionBadge = (action) => {
    switch (action) {
      case 'FILE_UPLOAD':
        return { label: 'Upload', icon: '📤', badgeClass: 'badge-brand' }
      case 'FILE_VERSION_UPLOAD':
        return { label: 'New Version', icon: '🕒', badgeClass: 'badge-ai' }
      case 'FILE_VERSION_RESTORE':
        return { label: 'Rollback', icon: '↺', badgeClass: 'badge-warning' }
      case 'FILE_DOWNLOAD':
      case 'FILE_SHARE_DOWNLOAD':
        return { label: 'Download', icon: '⬇️', badgeClass: 'badge-success' }
      case 'FILE_DELETE':
        return { label: 'Delete', icon: '🗑️', badgeClass: 'badge-danger' }
      case 'FILE_SHARE_CREATE':
        return { label: 'Shared Link', icon: '🔗', badgeClass: 'badge-brand' }
      case 'FILE_SHARE_ACCESS':
      case 'FILE_SHARE_VIEW':
        return { label: 'Viewed', icon: '👁️', badgeClass: 'badge-brand' }
      case 'FILE_SHARE_REVOKE':
        return { label: 'Revoked', icon: '🚫', badgeClass: 'badge-danger' }
      case 'AI_DOCUMENT_ANALYSIS':
      case 'AI_DOCUMENT_QA':
        return { label: 'AI Processing', icon: '✨', badgeClass: 'badge-ai' }
      case 'USER_LOGIN':
        return { label: 'Login', icon: '🔐', badgeClass: 'badge-success' }
      case 'USER_REGISTER':
        return { label: 'Registration', icon: '✨', badgeClass: 'badge-brand' }
      default:
        return { label: action.replace(/_/g, ' '), icon: '📋', badgeClass: 'badge-brand' }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const filteredActivities = activities.filter(item => {
    const matchesFilter = filterAction === 'ALL' || item.action.includes(filterAction)
    if (!matchesFilter) return false

    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matchesSearch = item.action.toLowerCase().includes(s) ||
        (item.file_name && item.file_name.toLowerCase().includes(s)) ||
        (item.ip_address && item.ip_address.includes(s))
      return matchesSearch
    }

    return true
  })

  return (
    <div className="activity-page">
      <div className="activity-top-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-brand">Audit Trail</span>
            <span className="file-count-indicator">{activities.length} Recorded Events</span>
          </div>
          <h1 className="page-heading">Security & Activity Log</h1>
          <p className="page-sub">Cryptographically logged audit trail of all file transfers, logins, and share actions</p>
        </div>
        <button onClick={fetchActivities} className="btn-secondary btn-sm">
          🔄 Refresh Log
        </button>
      </div>

      {error && <div className="alert-box error">{error}</div>}

      <div className="files-controls-bar glass-card">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search activity by action, filename, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-text-input"
          />
        </div>

        <div className="view-and-sort-controls">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="sort-dropdown"
          >
            <option value="ALL">All Event Types</option>
            <option value="FILE_UPLOAD">Uploads & Versions</option>
            <option value="DOWNLOAD">Downloads</option>
            <option value="SHARE">Shares & Revocations</option>
            <option value="AI">AI Interactions</option>
            <option value="DELETE">Deletions</option>
            <option value="USER">Authentication</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="activity-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Retrieving immutable audit logs...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="activity-empty-state glass-card">
          <span className="empty-log-icon">📜</span>
          <h3>No matching activity entries found</h3>
          <p>Actions performed on the platform will be cryptographically indexed here.</p>
        </div>
      ) : (
        <div className="timeline-wrapper">
          {filteredActivities.map((act) => {
            const badge = getActionBadge(act.action)
            return (
              <div key={act.id} className="timeline-entry glass-card">
                <div className="timeline-badge-block">
                  <span className="timeline-icon">{badge.icon}</span>
                </div>
                <div className="timeline-main">
                  <div className="timeline-header-row">
                    <span className={`badge ${badge.badgeClass}`}>{badge.label}</span>
                    <span className="timeline-timestamp">{formatDate(act.created_at)}</span>
                  </div>

                  <div className="timeline-body-text">
                    {act.file_name && (
                      <div className="timeline-target-file">
                        📄 Target File: <strong>{act.file_name}</strong>
                      </div>
                    )}

                    {act.details && typeof act.details === 'object' && (
                      <div className="details-chips-wrap">
                        {Object.entries(act.details).map(([k, v]) => (
                          <span key={k} className="detail-chip">
                            <span className="chip-key">{k}:</span> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="timeline-footer-row">
                    <span className="ip-badge">IP: {act.ip_address || '127.0.0.1'}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Activity
