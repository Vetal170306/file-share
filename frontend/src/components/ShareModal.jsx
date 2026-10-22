import { useState } from 'react'
import api from '../utils/api'
import './ShareModal.css'

const ShareModal = ({ file, onClose, onSuccess }) => {
  const [receiverEmail, setReceiverEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [expiryOption, setExpiryOption] = useState('24h')
  const [customExpiry, setCustomExpiry] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleShare = async (e) => {
    e.preventDefault()
    setError('')

    const email = receiverEmail.trim()
    if (!email) {
      setError('Please enter the recipient email address')
      return
    }

    let expiresInHours = null
    let customDate = null

    if (expiryOption === '1h') expiresInHours = 1
    else if (expiryOption === '24h') expiresInHours = 24
    else if (expiryOption === '7d') expiresInHours = 168
    else if (expiryOption === '30d') expiresInHours = 720
    else if (expiryOption === 'custom') {
      if (!customExpiry) {
        setError('Please choose a valid expiration date and time')
        return
      }
      customDate = new Date(customExpiry).toISOString()
    }

    if (hasPassword && (!password || password.trim().length < 4)) {
      setError('Share protection password must be at least 4 characters')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/shares', {
        file_id: file.id,
        receiver_email: email,
        permission,
        expires_in_hours: expiresInHours,
        expires_at: customDate,
        password: hasPassword ? password.trim() : null
      })

      if (onSuccess) onSuccess(response.data?.message)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create file share')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <div>
            <span className="badge badge-brand">Secure Link Generation</span>
            <h2 className="share-file-title">Share "{file.original_name}"</h2>
            <p className="share-file-sub">Grant granular view or download access with optional expiry and password encryption</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="share-error-box">{error}</div>}

        <form onSubmit={handleShare} className="share-form">
          <div className="form-group">
            <label className="form-label">Recipient Email</label>
            <input
              type="email"
              placeholder="e.g. colleague@company.com"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              required
              className="share-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Access Permission</label>
            <div className="permission-selector">
              <label className={`perm-option ${permission === 'view' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="permission"
                  value="view"
                  checked={permission === 'view'}
                  onChange={() => setPermission('view')}
                />
                <div className="perm-info">
                  <span className="perm-title">👁️ View Only</span>
                  <span className="perm-desc">Recipient can preview online, but cannot download original file</span>
                </div>
              </label>

              <label className={`perm-option ${permission === 'download' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="permission"
                  value="download"
                  checked={permission === 'download'}
                  onChange={() => setPermission('download')}
                />
                <div className="perm-info">
                  <span className="perm-title">⬇️ View & Download</span>
                  <span className="perm-desc">Recipient can preview and download the complete file</span>
                </div>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Link Expiration</label>
            <select
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value)}
              className="share-select"
              disabled={loading}
            >
              <option value="1h">Expires in 1 Hour</option>
              <option value="24h">Expires in 24 Hours (Default)</option>
              <option value="7d">Expires in 7 Days</option>
              <option value="30d">Expires in 30 Days</option>
              <option value="custom">Custom Date & Time...</option>
              <option value="never">No Expiration</option>
            </select>
          </div>

          {expiryOption === 'custom' && (
            <div className="form-group">
              <label className="form-label">Select Expiration Date & Time</label>
              <input
                type="datetime-local"
                value={customExpiry}
                onChange={(e) => setCustomExpiry(e.target.value)}
                className="share-input"
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group password-toggle-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasPassword}
                onChange={(e) => setHasPassword(e.target.checked)}
                disabled={loading}
              />
              <span>🔒 Protect with Access Password</span>
            </label>

            {hasPassword && (
              <input
                type="password"
                placeholder="Enter access passcode (min 4 chars)..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="share-input password-input-animated"
                disabled={loading}
              />
            )}
          </div>

          <div className="share-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sharing File...' : '🔗 Create Secure Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShareModal
