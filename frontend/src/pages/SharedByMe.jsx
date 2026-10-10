import { useState, useEffect } from 'react'
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
      setSuccessMsg('Share access revoked successfully')
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredShares = shares.filter(share =>
    share.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.receiver_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.receiver_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="shared-page">
      <div className="page-header">
        <div>
          <h1>📤 Shared By Me</h1>
          <p className="page-subtitle">Track and manage all files you've shared with others</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <a href="/my-files" className="btn-action btn-view" style={{ textDecoration: 'none' }}>
            ➕ Share Another File
          </a>
          <button onClick={fetchSentShares} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search by file name, recipient name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your shares...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📤</div>
          <h3>No outgoing shares found</h3>
          <p>{searchTerm ? 'No matches found' : 'You have not shared any files yet. Go to "My Files" to share a file with someone.'}</p>
          {!searchTerm && (
            <a href="/my-files" className="upload-button-small" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Go to My Files
            </a>
          )}
        </div>
      ) : (
        <div className="shares-table-container">
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredShares.map(share => (
                <tr key={share.id} className={`status-row-${share.status.toLowerCase()}`}>
                  <td className="col-filename">
                    <strong>{share.original_name}</strong>
                  </td>
                  <td>
                    <div>{share.receiver_name}</div>
                    <span className="sub-text">{share.receiver_email}</span>
                  </td>
                  <td>{formatFileSize(share.file_size)}</td>
                  <td>
                    <span className={`badge badge-perm-${share.permission}`}>
                      {share.permission === 'download' ? '⬇️ Download' : '👁️ View Only'}
                    </span>
                  </td>
                  <td>
                    {share.is_password_protected ? (
                      <span className="badge badge-locked">🔒 Password</span>
                    ) : (
                      <span className="sub-text">Standard</span>
                    )}
                  </td>
                  <td>{formatDate(share.created_at)}</td>
                  <td>
                    <span className={share.expires_at && new Date(share.expires_at) < new Date() ? 'text-expired' : ''}>
                      {formatDate(share.expires_at)}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-status-${share.status.toLowerCase()}`}>
                      {share.status}
                    </span>
                  </td>
                  <td className="col-actions">
                    {share.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleRevoke(share.id, share.original_name, share.receiver_email)}
                        className="btn-action btn-revoke"
                        title="Revoke Share Access"
                      >
                        🚫 Revoke
                      </button>
                    ) : (
                      <span className="sub-text">Revoked / Expired</span>
                    )}
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
