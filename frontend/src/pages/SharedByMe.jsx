import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import './SharedWithMe.css'

const SharedByMe = () => {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchSentShares()
  }, [])

  const fetchSentShares = async () => {
    try {
      setLoading(true)
      const res = await api.get('/shares/sent')
      setShares(res.data.shares || [])
      setError('')
    } catch (err) {
      setError('Failed to load sent shares')
      console.error('Fetch sent shares error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async (shareId, fileName, receiverEmail) => {
    if (!window.confirm(`Revoke access for "${fileName}" shared with ${receiverEmail}? The recipient will immediately lose access.`)) {
      return
    }

    try {
      await api.delete(`/shares/${shareId}/revoke`)
      setShares(shares.map(s => s.id === shareId ? { ...s, status: 'REVOKED', revoked_at: new Date().toISOString() } : s))
      setSuccessMsg(`Share access revoked for ${receiverEmail}`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to revoke share')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredShares = shares.filter(share =>
    share.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.receiver_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="shared-page">
      <div className="shared-top-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-brand">Outgoing Shares</span>
            <span className="file-count-indicator">{shares.length} Total</span>
          </div>
          <h1 className="page-heading">Shared By Me</h1>
          <p className="page-sub">Monitor outgoing permissions, passwords, and revoke access on demand</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/my-files" className="btn-primary btn-sm">
            ➕ Share Another File
          </Link>
          <button onClick={fetchSentShares} className="btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {successMsg && <div className="alert-box success">{successMsg}</div>}

      <div className="search-bar-container glass-card">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by file name, recipient name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input-field"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="clear-search-btn">✕</button>
        )}
      </div>

      {loading ? (
        <div className="shared-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Loading outgoing shares...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="shared-empty-state glass-card">
          <span className="empty-inbox-icon">📤</span>
          <h3>No outgoing shares found</h3>
          <p>{searchTerm ? 'No matches found.' : 'You have not shared any files yet. Go to "My Files" to share a file with someone.'}</p>
          {!searchTerm && (
            <Link to="/my-files" className="btn-primary" style={{ marginTop: '1rem' }}>
              Go to My Files
            </Link>
          )}
        </div>
      ) : (
        <div className="shares-table-wrapper glass-card">
          <table className="shares-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Recipient</th>
                <th>Size</th>
                <th>Permission</th>
                <th>Protection</th>
                <th>Shared Date</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShares.map(share => (
                <tr key={share.id} className={`share-row ${share.status.toLowerCase()}`}>
                  <td>
                    <div className="share-name-cell">
                      <span className="file-icon-mini">📄</span>
                      <strong className="share-file-title" title={share.original_name}>
                        {share.original_name}
                      </strong>
                    </div>
                  </td>
                  <td>
                    <div className="sender-cell">
                      <span className="sender-name">{share.receiver_name}</span>
                      <span className="sender-email">{share.receiver_email}</span>
                    </div>
                  </td>
                  <td>{formatFileSize(share.file_size)}</td>
                  <td>
                    <span className={`badge ${share.permission === 'download' ? 'badge-success' : 'badge-brand'}`}>
                      {share.permission === 'download' ? '⬇️ Download' : '👁️ View Only'}
                    </span>
                  </td>
                  <td>
                    {share.is_password_protected ? (
                      <span className="badge badge-warning">🔒 Protected</span>
                    ) : (
                      <span className="meta-sub">Standard</span>
                    )}
                  </td>
                  <td>{formatDate(share.created_at)}</td>
                  <td>
                    <span className={`expiry-date ${share.expires_at && new Date(share.expires_at) < new Date() ? 'expired-text' : ''}`}>
                      {formatDate(share.expires_at)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${share.status === 'ACTIVE' ? 'badge-success' : share.status === 'EXPIRED' ? 'badge-warning' : 'badge-danger'}`}>
                      {share.status}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      {share.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleRevoke(share.id, share.original_name, share.receiver_email)}
                          className="btn-danger btn-xs"
                          title="Revoke Share Access"
                        >
                          🚫 Revoke Access
                        </button>
                      ) : (
                        <span className="meta-sub">Revoked / Expired</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SharedByMe
