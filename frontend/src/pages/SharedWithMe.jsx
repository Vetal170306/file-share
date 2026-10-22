import { useState, useEffect } from 'react'
import api from '../utils/api'
import AiAssistantModal from '../components/AiAssistantModal'
import FilePreviewModal from '../components/FilePreviewModal'
import './SharedWithMe.css'

const SharedWithMe = () => {
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Password unlock state
  const [passwordModalShare, setPasswordModalShare] = useState(null)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [actionInProgress, setActionInProgress] = useState(false)

  // AI & Preview Modals
  const [aiModalFile, setAiModalFile] = useState(null)
  const [previewingFile, setPreviewingFile] = useState(null)

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
        setPreviewingFile({
          id: share.file_id,
          original_name: share.original_name,
          file_size: share.file_size,
          mime_type: share.mime_type
        })
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
      year: 'numeric'
    })
  }

  const filteredShares = shares.filter(share =>
    share.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    share.sender_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="shared-page">
      <div className="shared-top-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-brand">Incoming Shares</span>
            <span className="file-count-indicator">{shares.length} Items</span>
          </div>
          <h1 className="page-heading">Shared With Me</h1>
          <p className="page-sub">Access encrypted files shared by colleagues and collaborators</p>
        </div>
        <button onClick={fetchReceivedShares} className="btn-secondary btn-sm">
          🔄 Refresh Shares
        </button>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {successMsg && <div className="alert-box success">{successMsg}</div>}

      <div className="search-bar-container glass-card">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search by file name, sender name, or sender email..."
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
          <p>Loading incoming shares...</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="shared-empty-state glass-card">
          <span className="empty-inbox-icon">📥</span>
          <h3>No incoming shares found</h3>
          <p>{searchTerm ? 'No files match your search query.' : 'When someone shares an encrypted file with your email, it will appear here.'}</p>
        </div>
      ) : (
        <div className="shares-table-wrapper glass-card">
          <table className="shares-table">
            <thead>
              <tr>
                <th>File Name</th>
                <th>Sender</th>
                <th>Size</th>
                <th>Permission</th>
                <th>Passcode</th>
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
                      <span className="share-file-title" title={share.original_name}>
                        {share.original_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="sender-cell">
                      <span className="sender-name">{share.sender_name}</span>
                      <span className="sender-email">{share.sender_email}</span>
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
                      <span className="meta-sub">None</span>
                    )}
                  </td>
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
                        <>
                          <button
                            onClick={() => handleAccess(share, 'view')}
                            className="btn-secondary btn-xs"
                            title="Preview File"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => setAiModalFile({ id: share.file_id, original_name: share.original_name })}
                            className="btn-ai btn-xs"
                            title="AI Document Assistant"
                          >
                            ✨ AI
                          </button>
                          {share.permission === 'download' && (
                            <button
                              onClick={() => handleAccess(share, 'download')}
                              className="btn-primary btn-xs"
                              title="Download File"
                            >
                              ⬇️
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="meta-sub">Inactive</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Password Unlock Modal */}
      {passwordModalShare && (
        <div className="modal-overlay" onClick={() => setPasswordModalShare(null)}>
          <div className="modal-content password-unlock-modal" onClick={(e) => e.stopPropagation()}>
            <div className="unlock-modal-header">
              <div>
                <span className="badge badge-warning">Passcode Verification</span>
                <h2 className="unlock-title">🔒 Password Protected File</h2>
                <p className="unlock-sub">
                  <strong>{passwordModalShare.sender_name}</strong> set an access passcode for "{passwordModalShare.original_name}".
                </p>
              </div>
              <button className="modal-close-btn" onClick={() => setPasswordModalShare(null)}>✕</button>
            </div>

            {passwordError && <div className="alert-box error" style={{ marginBottom: '1rem' }}>{passwordError}</div>}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAccess(passwordModalShare, passwordModalShare.pendingAction, passwordInput)
              }}
              className="unlock-form"
            >
              <div className="form-group">
                <label className="form-label">Enter Access Passcode</label>
                <input
                  type="password"
                  placeholder="Enter passcode to decrypt..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="unlock-input"
                  required
                  autoFocus
                />
              </div>

              <div className="unlock-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPasswordModalShare(null)}
                  disabled={actionInProgress}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={actionInProgress}>
                  {actionInProgress ? 'Verifying Passcode...' : '🔓 Unlock & Proceed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
        />
      )}

      {/* AI Assistant Modal */}
      {aiModalFile && (
        <AiAssistantModal
          file={aiModalFile}
          onClose={() => setAiModalFile(null)}
        />
      )}
    </div>
  )
}

export default SharedWithMe
