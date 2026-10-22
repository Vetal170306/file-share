import { useState, useEffect, useRef } from 'react'
import api from '../utils/api'
import './VersionModal.css'

const VersionModal = ({ file, onClose, onVersionRestored, onNewVersionUploaded }) => {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploading, setUploading] = useState(false)
  const [changeSummary, setChangeSummary] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (file) {
      fetchVersions()
    }
  }, [file])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/files/${file.id}/versions`)
      setVersions(res.data.versions || [])
      setError('')
    } catch (err) {
      setError('Failed to load version history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadVersion = async (versionId, versionNumber) => {
    try {
      const response = await api.get(`/files/${file.id}/versions/${versionId}/download`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `v${versionNumber}_${file.original_name}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download this version')
    }
  }

  const handleRestoreVersion = async (versionId, versionNumber) => {
    if (!window.confirm(`Are you sure you want to restore Version ${versionNumber} as the active current version?`)) {
      return
    }

    try {
      setError('')
      const res = await api.post(`/files/${file.id}/versions/${versionId}/restore`)
      setSuccess(res.data.message || `Restored version ${versionNumber}`)
      await fetchVersions()
      if (onVersionRestored) onVersionRestored()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore version')
    }
  }

  const handleUploadVersion = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Please select a replacement file to upload as new version')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('change_summary', changeSummary.trim() || 'Updated version')

    try {
      const res = await api.post(`/files/${file.id}/version`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setSuccess(res.data.message || 'New version uploaded successfully!')
      setSelectedFile(null)
      setChangeSummary('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchVersions()
      if (onNewVersionUploaded) onNewVersionUploaded()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload version')
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content version-modal" onClick={(e) => e.stopPropagation()}>
        <div className="version-modal-header">
          <div>
            <span className="badge badge-brand">Version Control</span>
            <h2 className="version-title">{file.original_name}</h2>
            <p className="version-subtitle">Inspect earlier versions, download snapshots, or roll back</p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="version-alert version-alert-error">{error}</div>}
        {success && <div className="version-alert version-alert-success">{success}</div>}

        {/* Upload New Version Section */}
        <form onSubmit={handleUploadVersion} className="upload-version-box">
          <h4 className="box-heading">➕ Upload New Version</h4>
          <div className="upload-ver-row">
            <input
              ref={fileInputRef}
              type="file"
              id="newVerFile"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={uploading}
            >
              📁 {selectedFile ? selectedFile.name : 'Choose File...'}
            </button>
            <input
              type="text"
              placeholder="Changelog notes (e.g., 'Added section 3 summary')..."
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              className="version-notes-input"
              disabled={uploading}
            />
            <button
              type="submit"
              className="btn-primary btn-sm"
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Save Version'}
            </button>
          </div>
        </form>

        {/* Version Timeline */}
        <div className="version-timeline">
          <h4 className="box-heading">Timeline History ({versions.length})</h4>
          {loading ? (
            <div className="version-loading">Loading version tree...</div>
          ) : versions.length === 0 ? (
            <div className="version-empty">No versions recorded yet.</div>
          ) : (
            versions.map((ver) => (
              <div key={ver.id} className={`version-card ${ver.is_current ? 'is-current' : ''}`}>
                <div className="version-card-left">
                  <div className="version-pill-tag">
                    v{ver.version_number}
                    {ver.is_current && <span className="current-badge">CURRENT</span>}
                  </div>
                  <div className="version-meta">
                    <p className="version-notes">{ver.change_summary || 'No notes provided'}</p>
                    <span className="version-sub">
                      Uploaded by {ver.uploader_name || 'Owner'} • {formatFileSize(ver.file_size)} • {formatDate(ver.created_at)}
                    </span>
                  </div>
                </div>
                <div className="version-card-actions">
                  <button
                    type="button"
                    onClick={() => handleDownloadVersion(ver.id, ver.version_number)}
                    className="btn-secondary btn-xs"
                    title={`Download v${ver.version_number}`}
                  >
                    ⬇️ Download
                  </button>
                  {!ver.is_current && (
                    <button
                      type="button"
                      onClick={() => handleRestoreVersion(ver.id, ver.version_number)}
                      className="btn-primary btn-xs"
                      title="Restore as current"
                    >
                      ↺ Restore
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default VersionModal
