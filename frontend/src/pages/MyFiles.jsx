import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import ShareModal from '../components/ShareModal'
import VersionModal from '../components/VersionModal'
import AiAssistantModal from '../components/AiAssistantModal'
import FilePreviewModal from '../components/FilePreviewModal'
import './MyFiles.css'

const MyFiles = () => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // View, Filters & Sorting
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all') // 'all' | 'favorites' | 'pdf' | 'images' | 'docs' | 'spreadsheets'
  const [sortBy, setSortBy] = useState('date-desc') // 'date-desc' | 'date-asc' | 'name-asc' | 'size-desc'

  // Multi-selection
  const [selectedFileIds, setSelectedFileIds] = useState([])

  // Active Modals
  const [sharingFile, setSharingFile] = useState(null)
  const [versioningFile, setVersioningFile] = useState(null)
  const [aiModalFile, setAiModalFile] = useState(null)
  const [previewingFile, setPreviewingFile] = useState(null)

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

  const handleToggleFavorite = async (fileId, e) => {
    e.stopPropagation()
    try {
      const res = await api.post(`/files/${fileId}/favorite`)
      setFiles(prev =>
        prev.map(f => (f.id === fileId ? { ...f, is_favorite: res.data.isFavorite } : f))
      )
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
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
    }
  }

  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" and all its versions/shares?`)) {
      return
    }

    try {
      await api.delete(`/files/${fileId}`)
      setFiles(files.filter(file => file.id !== fileId))
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId))
      setSuccessMsg(`File "${fileName}" deleted successfully`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Failed to delete file')
    }
  }

  const handleBatchDelete = async () => {
    if (selectedFileIds.length === 0) return
    if (!window.confirm(`Delete ${selectedFileIds.length} selected files permanently?`)) return

    try {
      for (const id of selectedFileIds) {
        await api.delete(`/files/${id}`)
      }
      setFiles(files.filter(f => !selectedFileIds.includes(f.id)))
      setSuccessMsg(`Deleted ${selectedFileIds.length} files successfully`)
      setSelectedFileIds([])
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError('Failed to delete selected files')
    }
  }

  const toggleSelectFile = (fileId, e) => {
    e.stopPropagation()
    if (selectedFileIds.includes(fileId)) {
      setSelectedFileIds(selectedFileIds.filter(id => id !== fileId))
    } else {
      setSelectedFileIds([...selectedFileIds, fileId])
    }
  }

  const toggleSelectAll = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([])
    } else {
      setSelectedFileIds(filteredFiles.map(f => f.id))
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
      day: 'numeric'
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
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦'
    return '📁'
  }

  // Filter Logic
  let filteredFiles = files.filter(file => {
    const matchesSearch = file.original_name.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    const mime = (file.mime_type || '').toLowerCase()
    if (activeFilter === 'favorites') return !!file.is_favorite
    if (activeFilter === 'pdf') return mime.includes('pdf')
    if (activeFilter === 'images') return mime.startsWith('image/')
    if (activeFilter === 'docs') return mime.includes('word') || mime.includes('document') || mime.includes('presentation') || mime.includes('text')
    if (activeFilter === 'spreadsheets') return mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv')
    return true
  })

  // Sort Logic
  filteredFiles.sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.uploaded_at) - new Date(a.uploaded_at)
    if (sortBy === 'date-asc') return new Date(a.uploaded_at) - new Date(b.uploaded_at)
    if (sortBy === 'name-asc') return a.original_name.localeCompare(b.original_name)
    if (sortBy === 'size-desc') return (b.file_size || 0) - (a.file_size || 0)
    return 0
  })

  return (
    <div className="my-files-page">
      {/* Header Bar */}
      <div className="files-top-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-brand">File Vault</span>
            <span className="file-count-indicator">{files.length} Total Files</span>
          </div>
          <h1 className="page-heading">My Encrypted Files</h1>
          <p className="page-sub">Manage file version trees, AI summaries, and secure recipient shares</p>
        </div>
        <Link to="/upload" className="btn-primary">
          ➕ Upload New File
        </Link>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {successMsg && <div className="alert-box success">{successMsg}</div>}

      {/* Control Bar: Search, Filters, Sorting, Views */}
      <div className="files-controls-bar glass-card">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search files by name, type, or extension..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-text-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="clear-search-btn">✕</button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs-row">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'favorites', label: '⭐ Starred' },
            { id: 'pdf', label: '📄 PDFs' },
            { id: 'images', label: '🖼️ Images' },
            { id: 'docs', label: '📝 Documents' },
            { id: 'spreadsheets', label: '📈 Sheets' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`filter-pill ${activeFilter === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sorting and View Switcher */}
        <div className="view-and-sort-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-dropdown"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="size-desc">Size (Largest)</option>
          </select>

          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectedFileIds.length > 0 && (
        <div className="batch-actions-bar">
          <span>{selectedFileIds.length} file(s) selected</span>
          <div className="batch-btn-group">
            <button onClick={handleBatchDelete} className="btn-danger btn-xs">
              🗑️ Delete Selected
            </button>
            <button onClick={() => setSelectedFileIds([])} className="btn-secondary btn-xs">
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Files Display */}
      {loading ? (
        <div className="files-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Decrypting storage directory...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="files-empty-state glass-card">
          <span className="empty-folder-icon">📂</span>
          <h3>No files matching your criteria</h3>
          <p>{searchTerm ? 'Try adjusting your search query or filter' : 'Upload your first file to get started'}</p>
          {!searchTerm && (
            <Link to="/upload" className="btn-primary" style={{ marginTop: '1rem' }}>
              Upload File Now
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="files-card-grid">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className={`file-grid-card glass-card ${selectedFileIds.includes(file.id) ? 'is-selected' : ''}`}
              onClick={() => setPreviewingFile(file)}
            >
              <div className="grid-card-top" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedFileIds.includes(file.id)}
                  onChange={(e) => toggleSelectFile(file.id, e)}
                  className="file-select-checkbox"
                />
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(file.id, e)}
                  className={`favorite-toggle-btn ${file.is_favorite ? 'favorited' : ''}`}
                  title={file.is_favorite ? 'Remove Star' : 'Star Favorite'}
                >
                  {file.is_favorite ? '★' : '☆'}
                </button>
              </div>

              <div className="grid-card-center">
                <div className="file-hero-icon">{getFileIcon(file.mime_type)}</div>
                <h3 className="grid-file-name" title={file.original_name}>
                  {file.original_name}
                </h3>
                <div className="grid-file-badges">
                  <span className="file-size-tag">{formatFileSize(file.file_size)}</span>
                  <span className="version-pill-small">v{file.current_version || 1}</span>
                </div>
              </div>

              <div className="grid-card-footer" onClick={(e) => e.stopPropagation()}>
                <span className="file-date-sub">{formatDate(file.uploaded_at)}</span>

                <div className="card-action-bar">
                  <button
                    onClick={() => setAiModalFile(file)}
                    className="action-icon-pill ai-action"
                    title="AI Document Assistant"
                  >
                    ✨ AI
                  </button>
                  <button
                    onClick={() => setVersioningFile(file)}
                    className="action-icon-pill"
                    title="Version History"
                  >
                    🕒
                  </button>
                  <button
                    onClick={() => setSharingFile(file)}
                    className="action-icon-pill"
                    title="Share File"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => handleDownload(file.id, file.original_name)}
                    className="action-icon-pill"
                    title="Download"
                  >
                    ⬇️
                  </button>
                  <button
                    onClick={() => handleDelete(file.id, file.original_name)}
                    className="action-icon-pill delete-action"
                    title="Delete File"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="files-table-container glass-card">
          <table className="files-table">
            <thead>
              <tr>
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedFileIds.length > 0 && selectedFileIds.length === filteredFiles.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Name</th>
                <th>Version</th>
                <th>Size</th>
                <th>Uploaded</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map(file => (
                <tr
                  key={file.id}
                  className={`table-row ${selectedFileIds.includes(file.id) ? 'row-selected' : ''}`}
                  onClick={() => setPreviewingFile(file)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedFileIds.includes(file.id)}
                      onChange={(e) => toggleSelectFile(file.id, e)}
                    />
                  </td>
                  <td>
                    <div className="table-file-cell">
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(file.id, e)}
                        className={`favorite-toggle-btn ${file.is_favorite ? 'favorited' : ''}`}
                      >
                        {file.is_favorite ? '★' : '☆'}
                      </button>
                      <span className="table-file-icon">{getFileIcon(file.mime_type)}</span>
                      <span className="table-file-name" title={file.original_name}>
                        {file.original_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setVersioningFile(file)
                      }}
                      className="table-version-btn"
                    >
                      v{file.current_version || 1}
                    </button>
                  </td>
                  <td>{formatFileSize(file.file_size)}</td>
                  <td>{formatDate(file.uploaded_at)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions-flex">
                      <button
                        onClick={() => setAiModalFile(file)}
                        className="table-act-btn ai-act"
                        title="AI Document Assistant"
                      >
                        ✨ AI
                      </button>
                      <button
                        onClick={() => setSharingFile(file)}
                        className="table-act-btn"
                        title="Share"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => handleDownload(file.id, file.original_name)}
                        className="table-act-btn"
                        title="Download"
                      >
                        ⬇️
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.original_name)}
                        className="table-act-btn delete-act"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
          onDownload={handleDownload}
        />
      )}

      {sharingFile && (
        <ShareModal
          file={sharingFile}
          onClose={() => setSharingFile(null)}
          onSuccess={(msg) => {
            setSuccessMsg(msg || `File "${sharingFile.original_name}" shared successfully!`)
            setTimeout(() => setSuccessMsg(''), 5000)
            fetchFiles()
          }}
        />
      )}

      {versioningFile && (
        <VersionModal
          file={versioningFile}
          onClose={() => setVersioningFile(null)}
          onVersionRestored={fetchFiles}
          onNewVersionUploaded={fetchFiles}
        />
      )}

      {aiModalFile && (
        <AiAssistantModal
          file={aiModalFile}
          onClose={() => setAiModalFile(null)}
        />
      )}
    </div>
  )
}

export default MyFiles
