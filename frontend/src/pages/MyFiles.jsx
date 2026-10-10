import { useState, useEffect } from 'react'
import api from '../utils/api'
import ShareModal from '../components/ShareModal'
import './MyFiles.css'

const MyFiles = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sharingFile, setSharingFile] = useState(null)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await api.get('/files')
      setFiles(response.data.files || [])
      setError('')
    } catch (err) {
      setError('Failed to load files')
      console.error('Fetch files error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (fileId, fileName) => {
    try {
      const response = await api.get(`/files/${fileId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download file')
      console.error('Download error:', err)
    }
  }

  const handleDelete = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file? All active shares for it will also be removed.')) {
      return
    }

    try {
      await api.delete(`/files/${fileId}`)
      setFiles(files.filter(file => file.id !== fileId))
      setSuccessMsg('File deleted successfully')
      setTimeout(() => setSuccessMsg(''), 3000)
      setError('')
    } catch (err) {
      setError('Failed to delete file')
      console.error('Delete error:', err)
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
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (mimeType = '') => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊'
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📈'
    if (mimeType.includes('image')) return '🖼️'
    if (mimeType.includes('video')) return '🎥'
    if (mimeType.includes('audio')) return '🎵'
    if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('compressed')) return '📦'
    return '📁'
  }

  const filteredFiles = files.filter(file =>
    file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="my-files-page">
      <div className="my-files-header">
        <div>
          <h1>My Files</h1>
          <p className="page-subtitle">Manage, download, and securely share your uploaded files</p>
        </div>
        <a href="/upload" className="upload-button-small">➕ Upload New File</a>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search files by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading files...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No files found</h3>
          <p>{searchTerm ? 'Try a different search term' : 'Upload your first file to get started'}</p>
          {!searchTerm && (
            <a href="/upload" className="upload-button-small">Upload File</a>
          )}
        </div>
      ) : (
        <div className="files-grid">
          {filteredFiles.map(file => (
            <div key={file.id} className="file-card">
              <div className="file-icon">{getFileIcon(file.mime_type)}</div>
              <div className="file-info">
                <h3 className="file-name" title={file.original_name}>
                  {file.original_name}
                </h3>
                <p className="file-meta">
                  {formatFileSize(file.file_size)} • {formatDate(file.uploaded_at)}
                </p>
                <span className="file-type-badge">{file.mime_type || 'Unknown'}</span>
              </div>
              <div className="file-actions">
                <button
                  onClick={() => setSharingFile(file)}
                  className="action-btn share-btn"
                  title="Share File"
                >
                  🔗
                </button>
                <button
                  onClick={() => handleDownload(file.id, file.original_name)}
                  className="action-btn download-btn"
                  title="Download File"
                >
                  ⬇️
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="action-btn delete-btn"
                  title="Delete File"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sharingFile && (
        <ShareModal
          file={sharingFile}
          onClose={() => setSharingFile(null)}
          onSuccess={() => {
            setSuccessMsg(`File "${sharingFile.original_name}" shared successfully!`)
            setTimeout(() => setSuccessMsg(''), 4000)
          }}
        />
      )}
    </div>
  )
}

export default MyFiles
