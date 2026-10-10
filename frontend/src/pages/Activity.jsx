import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Activity.css'

const Activity = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')

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
        return { label: 'Upload', icon: '📤', color: 'upload' }
      case 'FILE_DOWNLOAD':
      case 'FILE_SHARE_DOWNLOAD':
        return { label: 'Download', icon: '⬇️', color: 'download' }
      case 'FILE_DELETE':
        return { label: 'Delete', icon: '🗑️', color: 'delete' }
      case 'FILE_SHARE_CREATE':
        return { label: 'Shared File', icon: '🔗', color: 'share' }
      case 'FILE_SHARE_ACCESS':
      case 'FILE_SHARE_VIEW':
        return { label: 'Viewed Share', icon: '👁️', color: 'view' }
      case 'FILE_SHARE_REVOKE':
        return { label: 'Revoked Share', icon: '🚫', color: 'revoke' }
      case 'USER_LOGIN':
        return { label: 'Login', icon: '🔐', color: 'auth' }
      case 'USER_REGISTER':
        return { label: 'Registration', icon: '✨', color: 'auth' }
      default:
        return { label: action.replace(/_/g, ' '), icon: '📋', color: 'default' }
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
    if (filterAction === 'ALL') return true
    return item.action.includes(filterAction)
  })

  return (
    <div className="activity-page">
      <div className="activity-header">
        <div>
          <h1>📜 Activity & Security Audit Log</h1>
          <p className="page-subtitle">Track security events, file transfers, and account access</p>
        </div>
        <div className="activity-controls">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="select-filter"
          >
            <option value="ALL">All Events</option>
            <option value="FILE_UPLOAD">File Uploads</option>
            <option value="DOWNLOAD">Downloads</option>
            <option value="SHARE">Shares</option>
            <option value="DELETE">Deletions</option>
            <option value="USER">Auth & Login</option>
          </select>
          <button onClick={fetchActivities} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <h3>No activity logs found</h3>
          <p>Actions such as uploads, downloads, and shares will be automatically recorded here.</p>
        </div>
      ) : (
        <div className="timeline-container">
          {filteredActivities.map((act) => {
            const badge = getActionBadge(act.action)
            return (
              <div key={act.id} className="timeline-card">
                <div className={`timeline-icon-bubble bubble-${badge.color}`}>
                  {badge.icon}
                </div>
                <div className="timeline-content">
                  <div className="timeline-top">
                    <span className={`badge-pill pill-${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="timeline-time">{formatDate(act.created_at)}</span>
                  </div>
                  <div className="timeline-body">
                    {act.file_name && (
                      <p className="timeline-file">
                        📄 File: <strong>{act.file_name}</strong>
                      </p>
                    )}
                    {act.details && (
                      <div className="timeline-details">
                        {typeof act.details === 'object' ? (
                          <div className="details-tags">
                            {Object.entries(act.details).map(([k, v]) => (
                              <span key={k} className="detail-tag">
                                <strong>{k}:</strong> {String(v)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p>{act.details}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {act.ip_address && (
                    <div className="timeline-meta">
                      <span>IP: {act.ip_address}</span>
                    </div>
                  )}
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
