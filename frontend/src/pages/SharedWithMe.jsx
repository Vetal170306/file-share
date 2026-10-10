import { useState, useEffect } from 'react'
import api from '../utils/api'
import './SharedWithMe.css'

const SharedWithMe = () => {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Password prompt state
  const [passwordModalShare, setPasswordModalShare] = useState(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    fetchReceivedShares()
  }, [])

  const fetchReceivedShares = async () => {
    try {
      setLoading(true)
      const res = await api.get('/shares/received')
      setShares(res.data.shares || [])
      setError('')
    } catch (err) {
      setError('Failed to load shared files')
      console.error('Fetch received shares error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAccess = async (share, actionType = 'view', providedPassword = null) => {
    if (share.status !== 'ACTIVE') {
      setError(`Cannot access file. Share is ${share.status.toLowerCase()}.`)
      return
    }

    if (actionType === 'download' && share.permission !== 'download') {
      setError('You only have permission to view this file, not download it.')
      return
    }

    if (share.is_password_protected && !providedPassword) {
      setPasswordModalShare({ ...share, pendingAction: actionType })
      setPasswordInput('')
      setPasswordError('')
      return
    }

    try {
      setActionInProgress(true)
      setPasswordError('')

      if (actionType === 'download') {
        const response = await api.post(
          `/shares/${share.id}/access?download=true`,
          { password: providedPassword, action: 'download' },
          { responseType: 'blob' }
        )

        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', share.original_name)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)

        if (passwordModalShare) setPasswordModalShare(null)
        setSuccessMsg(`Downloading "${share.original_name}"`)
        setTimeout(() => setSuccessMsg(''), 3000)
      } else {
        const response = await api.post(`/shares/${share.id}/access`, {
          password: providedPassword,
          action: 'view'
        })
        if (passwordModalShare) setPasswordModalShare(null)
        setSuccessMsg(`Verified access for "${response.data.file.original_name}" (${response.data.file.permission} mode)`)
        setTimeout(() => setSuccessMsg(''), 4000)
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to access file'
      if (passwordModalShare) {
        setPasswordError(msg)
      } else {
        setError(msg)
      }
    } finally {
      setActionInProgress(false)
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
    share.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.sender_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="shared-page">
      <div className="page-header">
        <div>
          <h1>📥 Shared With Me</h1>
          <p className="page-subtitle">Files shared with you by other users</p>
        </div>
        <button onClick={fetchReceivedShares} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search by file name, sender name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading shared files...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No shared files found</h3>
          <p>{searchTerm ? 'No matches for your search' : 'When someone shares a file with your email, it will appear here.'}</p>
        </div>
      ) : (
        <div className="shares-table-container">
          <table className="shares-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Shared By</th>
                <th>Size</th>
                <th>Permission</th>
                <th>Security</th>
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
                    <div>{share.sender_name}</div>
                    <span className="sub-text">{share.sender_email}</span>
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
                    {share.status === 'ACTIVE' && (
                      <>
                        {share.permission === 'download' ? (
                          <button
                            onClick={() => handleAccess(share, 'download')}
                            className="btn-action btn-download"
                            title="Download Shared File"
                          >
                            ⬇️ Download
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAccess(share, 'view')}
                            className="btn-action btn-view"
                            title="View File Details"
                          >
                            👁️ View
                          </button>
                        )}
                      </>
                    )}
                    {share.status !== 'ACTIVE' && (
                      <span className="sub-text">Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {passwordModalShare && (
        <div className="modal-overlay" onClick={() => setPasswordModalShare(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔒 Password Protected File</h2>
              <button className="close-btn" onClick={() => setPasswordModalShare(null)}>&times;</button>
            </div>
            {passwordError && <div className="modal-alert modal-error">{passwordError}</div>}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAccess(passwordModalShare, passwordModalShare.pendingAction, passwordInput)
              }}
              className="modal-form"
            >
              <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
                Please enter the access password set by <strong>{passwordModalShare.sender_name}</strong> to access "<strong>{passwordModalShare.original_name}</strong>".
              </p>
              <div className="form-group">
                <label>File Password</label>
                <input
                  type="password"
                  placeholder="Enter file password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setPasswordModalShare(null)}
                  disabled={actionInProgress}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={actionInProgress}>
                  {actionInProgress ? 'Verifying...' : 'Unlock & Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SharedWithMe
