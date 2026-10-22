import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import AiAssistantModal from '../components/AiAssistantModal'
import FilePreviewModal from '../components/FilePreviewModal'
import ShareModal from '../components/ShareModal'
import VersionModal from '../components/VersionModal'
import './Dashboard.css'

const TOTAL_STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 * 1024 // 5 GB

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedWithMe: 0,
    sharedByMe: 0,
    storageUsed: 0,
    favoritesCount: 0
  })
  const [recentFiles, setRecentFiles] = useState([])
  const [breakdown, setBreakdown] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  // Active Modals
  const [aiModalFile, setAiModalFile] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [shareFile, setShareFile] = useState(null)
  const [versionFile, setVersionFile] = useState(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [filesRes, receivedRes, sentRes, activityRes] = await Promise.allSettled([
        api.get('/files'),
        api.get('/shares/received'),
        api.get('/shares/sent'),
        api.get('/activity')
      ])

      const files = filesRes.status === 'fulfilled' ? (filesRes.value.data.files || []) : []
      const received = receivedRes.status === 'fulfilled' ? (receivedRes.value.data.shares || []) : []
      const sent = sentRes.status === 'fulfilled' ? (sentRes.value.data.shares || []) : []
      const activities = activityRes.status === 'fulfilled' ? (activityRes.value.data.activities || []) : []

      const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)
      const favorites = files.filter(f => f.is_favorite)

      // Storage breakdown by category
      const categories = {
        'PDF Documents': { size: 0, count: 0, color: '#ef4444' },
        'Images': { size: 0, count: 0, color: '#06b6d4' },
        'Office Docs': { size: 0, count: 0, color: '#3b82f6' },
        'Spreadsheets': { size: 0, count: 0, color: '#10b981' },
        'Archives/Other': { size: 0, count: 0, color: '#8b5cf6' }
      }

      files.forEach(f => {
        const mime = (f.mime_type || '').toLowerCase()
        const size = f.file_size || 0
        if (mime.includes('pdf')) {
          categories['PDF Documents'].size += size
          categories['PDF Documents'].count += 1
        } else if (mime.startsWith('image/')) {
          categories['Images'].size += size
          categories['Images'].count += 1
        } else if (mime.includes('word') || mime.includes('document') || mime.includes('presentation') || mime.includes('text')) {
          categories['Office Docs'].size += size
          categories['Office Docs'].count += 1
        } else if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv')) {
          categories['Spreadsheets'].size += size
          categories['Spreadsheets'].count += 1
        } else {
          categories['Archives/Other'].size += size
          categories['Archives/Other'].count += 1
        }
      })

      const breakdownArray = Object.entries(categories).map(([name, data]) => ({
        name,
        size: data.size,
        count: data.count,
        color: data.color,
        percentage: totalSize > 0 ? ((data.size / totalSize) * 100).toFixed(1) : 0
      }))

      setStats({
        totalFiles: files.length,
        sharedWithMe: received.filter(s => s.status === 'ACTIVE').length,
        sharedByMe: sent.filter(s => s.status === 'ACTIVE').length,
        storageUsed: totalSize,
        favoritesCount: favorites.length
      })

      setBreakdown(breakdownArray)
      setRecentFiles(files.slice(0, 6))
      setRecentActivity(activities.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb < 1) {
      return (bytes / 1024).toFixed(1) + ' KB'
    }
    return mb.toFixed(2) + ' MB'
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

  const handleDownload = async (fileId, fileName) => {
    try {
      const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download file')
    }
  }

  const storageUsedPercentage = Math.min(100, (stats.storageUsed / TOTAL_STORAGE_QUOTA_BYTES) * 100).toFixed(1)

  return (
    <div className="dashboard-page">
      {/* Welcome Banner */}
      <div className="welcome-banner glass-card">
        <div className="welcome-left">
          <div className="welcome-greeting">
            <span className="badge badge-brand">Secure Cloud Workspace</span>
            <h1 className="welcome-title">Welcome back, {user?.name || 'User'}!</h1>
            <p className="welcome-desc">
              Your files are safeguarded with end-to-end access rules and powered by intelligent AI document processing.
            </p>
          </div>
          <div className="welcome-quick-actions">
            <Link to="/upload" className="btn-primary">
              ➕ Upload File
            </Link>
            <Link to="/my-files" className="btn-secondary">
              📁 Browse Files
            </Link>
          </div>
        </div>

        {/* Storage Health Gauge Card */}
        <div className="storage-gauge-card">
          <div className="gauge-header">
            <span className="gauge-title">Storage Consumption</span>
            <span className="gauge-percent">{storageUsedPercentage}%</span>
          </div>
          <div className="gauge-progress-track">
            <div
              className="gauge-progress-fill"
              style={{ width: `${Math.max(2, storageUsedPercentage)}%` }}
            />
          </div>
          <div className="gauge-footer">
            <span>{formatFileSize(stats.storageUsed)} used</span>
            <span>5.0 GB Quota</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Syncing encrypted storage telemetry...</p>
        </div>
      ) : (
        <>
          {/* KPI Stat Cards */}
          <div className="stats-kpi-grid">
            <Link to="/my-files" className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                📁
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats.totalFiles}</span>
                <span className="kpi-label">Uploaded Files</span>
              </div>
            </Link>

            <Link to="/shared-with-me" className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
                📥
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats.sharedWithMe}</span>
                <span className="kpi-label">Shared With Me</span>
              </div>
            </Link>

            <Link to="/shared-by-me" className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                🔗
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats.sharedByMe}</span>
                <span className="kpi-label">Active Shares</span>
              </div>
            </Link>

            <Link to="/my-files" className="kpi-card glass-card">
              <div className="kpi-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                ⭐
              </div>
              <div className="kpi-data">
                <span className="kpi-number">{stats.favoritesCount}</span>
                <span className="kpi-label">Starred Favorites</span>
              </div>
            </Link>
          </div>

          {/* Storage Breakdown Section */}
          <div className="storage-breakdown-card glass-card">
            <div className="card-header-row">
              <h3 className="section-title">📊 Storage Breakdown by Type</h3>
              <span className="badge badge-brand">{stats.totalFiles} Files Indexed</span>
            </div>

            <div className="segmented-bar-track">
              {breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="segment-bar-fill"
                  style={{
                    width: `${Math.max(1, item.percentage)}%`,
                    backgroundColor: item.color
                  }}
                  title={`${item.name}: ${formatFileSize(item.size)} (${item.percentage}%)`}
                />
              ))}
            </div>

            <div className="breakdown-legend-grid">
              {breakdown.map((item, idx) => (
                <div key={idx} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: item.color }} />
                  <span className="legend-name">{item.name}</span>
                  <span className="legend-size">{formatFileSize(item.size)} ({item.count})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Two Columns: Recent Files + Recent Activity */}
          <div className="dashboard-grid-2col">
            {/* Recent Files */}
            <div className="recent-files-card glass-card">
              <div className="card-header-row">
                <h3 className="section-title">🕒 Recent Uploads</h3>
                <Link to="/my-files" className="view-all-link">
                  View All Files →
                </Link>
              </div>

              {recentFiles.length === 0 ? (
                <div className="empty-box">
                  <p>No files uploaded yet.</p>
                  <Link to="/upload" className="btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    Upload First File
                  </Link>
                </div>
              ) : (
                <div className="recent-files-list">
                  {recentFiles.map(file => (
                    <div key={file.id} className="recent-file-item">
                      <div className="file-item-left">
                        <div className="file-icon-box">{getFileIcon(file.mime_type)}</div>
                        <div className="file-text-block">
                          <span className="file-name-text" title={file.original_name}>
                            {file.original_name}
                          </span>
                          <span className="file-sub-meta">
                            {formatFileSize(file.file_size)} • v{file.current_version || 1}
                          </span>
                        </div>
                      </div>

                      <div className="file-action-buttons">
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="icon-action-btn"
                          title="Preview File"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => setAiModalFile(file)}
                          className="icon-action-btn ai-btn"
                          title="AI Document Assistant"
                        >
                          ✨ AI
                        </button>
                        <button
                          onClick={() => setVersionFile(file)}
                          className="icon-action-btn"
                          title="Version History"
                        >
                          🕒 v{file.current_version || 1}
                        </button>
                        <button
                          onClick={() => setShareFile(file)}
                          className="icon-action-btn"
                          title="Share"
                        >
                          🔗
                        </button>
                        <button
                          onClick={() => handleDownload(file.id, file.original_name)}
                          className="icon-action-btn"
                          title="Download"
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="recent-activity-card glass-card">
              <div className="card-header-row">
                <h3 className="section-title">📜 Audit Trail & Events</h3>
                <Link to="/activity" className="view-all-link">
                  Full Log →
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="empty-box">
                  <p>No activity logged yet.</p>
                </div>
              ) : (
                <div className="activity-mini-list">
                  {recentActivity.map(act => (
                    <div key={act.id} className="activity-mini-item">
                      <div className="act-dot" />
                      <div className="act-info">
                        <span className="act-action-badge">{act.action}</span>
                        <span className="act-time">
                          {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {aiModalFile && (
        <AiAssistantModal
          file={aiModalFile}
          onClose={() => setAiModalFile(null)}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onSuccess={() => {
            alert(`File "${shareFile.original_name}" shared successfully!`)
            fetchDashboardData()
          }}
        />
      )}

      {versionFile && (
        <VersionModal
          file={versionFile}
          onClose={() => setVersionFile(null)}
          onVersionRestored={fetchDashboardData}
          onNewVersionUploaded={fetchDashboardData}
        />
      )}
    </div>
  )
}

export default Dashboard
