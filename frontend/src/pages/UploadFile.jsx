import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import './UploadFile.css'

const UploadFile = () => {
  const [file, setFile] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Only reset if moving outside the dropzone element
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const triggerBrowse = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '' // clear to allow re-selecting the same file
      fileInputRef.current.click()
    }
  }

  const handleRemoveFile = (e) => {
    e.stopPropagation()
    setFile(null)
    setSuccess('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateAndSetFile = (selectedFile) => {
    setError('')
    setSuccess('')

    if (!selectedFile) {
      setError('No file selected')
      return
    }

    // File size validation (100MB max)
    const maxSize = 100 * 1024 * 1024 // 100MB in bytes
    if (selectedFile.size > maxSize) {
      setError('File size exceeds 100MB limit')
      return
    }

    // File type validation
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/zip',
      'audio/mpeg',
      'video/mp4'
    ]

    if (selectedFile.type && !allowedTypes.includes(selectedFile.type)) {
      // Also check by file extension for edge cases where browser mime is generic
      const ext = selectedFile.name.split('.').pop()?.toLowerCase()
      const allowedExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'jpg', 'jpeg', 'png', 'zip', 'mp3', 'mp4']
      if (!allowedExts.includes(ext)) {
        setError('Invalid file type. Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, JPEG, PNG, ZIP, MP3, MP4')
        return
      }
    }

    setFile(selectedFile)
    setSuccess(`File selected: ${selectedFile.name}`)
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setError('')
    setSuccess('')
    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setUploadProgress(progress)
          }
        }
      })

      setSuccess('File uploaded successfully!')
      setFile(null)
      setUploadProgress(0)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Redirect to My Files after 1.5 seconds
      setTimeout(() => {
        navigate('/my-files')
      }, 1500)

    } catch (err) {
      setError(err.response?.data?.message || 'File upload failed')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (type = '') => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('powerpoint') || type.includes('presentation')) return '📊'
    if (type.includes('excel') || type.includes('spreadsheet')) return '📈'
    if (type.includes('image')) return '🖼️'
    if (type.includes('video')) return '🎥'
    if (type.includes('audio')) return '🎵'
    if (type.includes('zip')) return '📦'
    return '📁'
  }

  return (
    <div className="upload-file-page">
      <div className="upload-container">
        <h1 className="upload-title">Upload File</h1>
        <p className="upload-subtitle">Securely upload and manage your files with end-to-end access control</p>

        {error && <div className="upload-error">{error}</div>}
        {success && <div className="upload-success">{success}</div>}

        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          onChange={handleFileSelect}
          className="upload-input"
          style={{ display: 'none' }}
          disabled={uploading}
        />

        <div 
          className={`upload-dropzone ${file ? 'has-file' : ''} ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!file && !uploading) triggerBrowse()
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !file && !uploading) {
              e.preventDefault()
              triggerBrowse()
            }
          }}
        >
          {!file ? (
            <div className="upload-prompt">
              <div className="upload-icon">📁</div>
              <p className="upload-text">
                Drag and drop your file here, or{' '}
                <button
                  type="button"
                  className="browse-link-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    triggerBrowse()
                  }}
                  disabled={uploading}
                >
                  Browse Files
                </button>
              </p>
              <p className="upload-hint">
                Maximum file size: 100MB
              </p>
              <p className="upload-hint">
                Allowed types: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, JPEG, PNG, ZIP, MP3, MP4
              </p>
            </div>
          ) : (
            <div className="upload-file-info" onClick={(e) => e.stopPropagation()}>
              <div className="file-icon-large">{getFileIcon(file.type)}</div>
              <div className="file-details">
                <p className="file-name">{file.name}</p>
                <p className="file-size">{formatFileSize(file.size)}</p>
                <p className="file-type">{file.type || 'Document'}</p>
              </div>
              <div className="file-item-actions">
                <button
                  type="button"
                  className="change-file-btn"
                  onClick={triggerBrowse}
                  disabled={uploading}
                  title="Choose another file"
                >
                  Change
                </button>
                <button 
                  type="button"
                  className="remove-file-btn"
                  onClick={handleRemoveFile}
                  disabled={uploading}
                  title="Remove selected file"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {uploading && (
          <div className="upload-progress-container">
            <div className="upload-progress-bar">
              <div 
                className="upload-progress-fill"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="upload-progress-text">{uploadProgress}% Uploaded</p>
          </div>
        )}

        <button 
          className="upload-button"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>

        <button 
          className="cancel-button"
          onClick={() => navigate('/my-files')}
          disabled={uploading}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default UploadFile
