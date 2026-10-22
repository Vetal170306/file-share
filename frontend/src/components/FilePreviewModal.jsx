import { useState, useEffect } from 'react'
import api from '../utils/api'
import './FilePreviewModal.css'

const FilePreviewModal = ({ file, onClose, onDownload }) => {
  const [textContent, setTextContent] = useState(null)
  const [loadingText, setLoadingText] = useState(false)
  const [error, setError] = useState('')

  const isImage = file.mime_type?.startsWith('image/')
  const isPdf = file.mime_type?.includes('pdf') || file.original_name.toLowerCase().endsWith('.pdf')
  const isText = 
    file.mime_type?.includes('text') || 
    file.mime_type?.includes('json') || 
    ['.txt', '.md', '.json', '.csv', '.log', '.js', '.py', '.html', '.css', '.env', '.sql'].some(ext => file.original_name.toLowerCase().endsWith(ext))

  useEffect(() => {
    if (isText) {
      loadTextPreview()
    }
  }, [file])

  const loadTextPreview = async () => {
    try {
      setLoadingText(true)
      const res = await api.get(`/files/${file.id}/preview`, { responseType: 'text' })
      setTextContent(res.data)
    } catch (err) {
      setError('Could not load text preview')
    } finally {
      setLoadingText(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-title-block">
            <span className="badge badge-brand">Secure Preview</span>
            <h3 className="preview-filename">{file.original_name}</h3>
            <span className="preview-meta">{formatFileSize(file.file_size)} • {file.mime_type || 'File'}</span>
          </div>
          <div className="preview-header-actions">
            {onDownload && (
              <button onClick={() => onDownload(file.id, file.original_name)} className="btn-primary btn-sm">
                ⬇️ Download
              </button>
            )}
            <button className="modal-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="preview-body">
          {isImage ? (
            <div className="preview-image-container">
              <img
                src={`/api/files/${file.id}/preview`}
                alt={file.original_name}
                className="preview-img"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`/api/files/${file.id}/preview#toolbar=1`}
              title={file.original_name}
              className="preview-iframe"
            />
          ) : isText ? (
            <div className="preview-text-box">
              {loadingText ? (
                <div className="preview-loading">Loading text content...</div>
              ) : error ? (
                <div className="preview-error">{error}</div>
              ) : (
                <pre className="preview-code-block">{textContent}</pre>
              )}
            </div>
          ) : (
            <div className="preview-unsupported">
              <span className="unsupported-icon">📦</span>
              <h4>Direct in-browser preview unavailable for this format</h4>
              <p>Download the file to view it securely on your device.</p>
              {onDownload && (
                <button onClick={() => onDownload(file.id, file.original_name)} className="btn-primary" style={{ marginTop: '1rem' }}>
                  ⬇️ Download "{file.original_name}"
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FilePreviewModal
