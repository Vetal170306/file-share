import { useState } from 'react'
import api from '../utils/api'
import './ShareModal.css'

const ShareModal = ({ file, onClose, onSuccess }) => {
  const [receiverEmail, setReceiverEmail] = useState('')
  const [permission, setPermission] = useState('view')
  const [password, setPassword] = useState('')
  const [expiryOption, setExpiryOption] = useState('24') // hours
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleShare = async (e) => {
    e.preventDefault()
    if (!receiverEmail.trim()) {
      setError('Please enter a recipient email')
      return
    }

    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const payload = {
        file_id: file.id,
        receiver_email: receiverEmail.trim(),
        permission,
        password: password.trim() || undefined,
        expires_in_hours: expiryOption !== 'never' ? parseInt(expiryOption, 10) : undefined
      }

      const res = await api.post('/shares', payload)
      setSuccessMsg(res.data.message || 'File shared successfully!')
      setTimeout(() => {
        if (onSuccess) onSuccess(res.data.share)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to share file')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🔗 Share "{file.original_name}"</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        {error && <div className="modal-alert modal-error">{error}</div>}
        {successMsg && <div className="modal-alert modal-success">{successMsg}</div>}

        <form onSubmit={handleShare} className="modal-form">
          <div className="form-group">
            <label>Recipient User Email</label>
            <input
              type="email"
              placeholder="user@example.com"
              value={receiverEmail}
              onChange={(e) => setReceiverEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Access Permission</label>
            <div className="radio-group">
              <label className={`radio-label ${permission === 'view' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="permission"
                  value="view"
                  checked={permission === 'view'}
                  onChange={() => setPermission('view')}
                />
                👁️ View Only
              </label>
              <label className={`radio-label ${permission === 'download' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="permission"
                  value="download"
                  checked={permission === 'download'}
                  onChange={() => setPermission('download')}
                />
                ⬇️ View & Download
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>Link Expiration</label>
            <select
              value={expiryOption}
              onChange={(e) => setExpiryOption(e.target.value)}
              className="select-input"
            >
              <option value="1">1 Hour</option>
              <option value="24">24 Hours (1 Day)</option>
              <option value="72">3 Days</option>
              <option value="168">7 Days</option>
              <option value="720">30 Days</option>
              <option value="never">No Expiration</option>
            </select>
          </div>

          <div className="form-group">
            <label>Optional Password Protection</label>
            <input
              type="password"
              placeholder="Leave empty for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="form-hint">
              If set, recipient must enter this password to access the file.
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Sharing...' : 'Share File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShareModal
