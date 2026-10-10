import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedWithMe: 0,
    sharedByMe: 0,
    storageUsed: 0
  })
  const [recentFiles, setRecentFiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [filesRes, receivedRes, sentRes] = await Promise.allSettled([
        api.get('/files'),
        api.get('/shares/received'),
        api.get('/shares/sent')
      ])

      const files = filesRes.status === 'fulfilled' ? (filesRes.value.data.files || []) : []
      const received = receivedRes.status === 'fulfilled' ? (receivedRes.value.data.shares || []) : []
      const sent = sentRes.status === 'fulfilled' ? (sentRes.value.data.shares || []) : []

      const totalSize = files.reduce((sum, file) => sum + (file.file_size || 0), 0)

      setStats({
        totalFiles: files.length,
        sharedWithMe: received.filter(s => s.status === 'ACTIVE').length,
        sharedByMe: sent.filter(s => s.status === 'ACTIVE').length,
        storageUsed: totalSize
      })

      setRecentFiles(files.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch stats:', error)
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

  return (
    <div className="dashboard">
      <div className="dashboard-header-container">
        <div>
          <h1 className="dashboard-title">Welcome back, {user?.name}!</h1>
          <p className="dashboard-subtitle">Your encrypted file sharing and management dashboard</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Link to="/admin" className="action-button action-button-primary" style={{ height: 'fit-content' }}>
            🛡️ Admin Panel
          </Link>
        )}
      </div>
      
      {loading ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading dashboard statistics...</p>
        </div>
      ) : (
        <>
          <div className="dashboard-stats">
            <Link to="/my-files" className="stat-card stat-card-link">
              <h3>My Files</h3>
              <p className="stat-value">{stats.totalFiles}</p>
              <p className="stat-label">Total files uploaded</p>
            </Link>
            <Link to="/shared-with-me" className="stat-card stat-card-link">
              <h3>Shared With Me</h3>
              <p className="stat-value">{stats.sharedWithMe}</p>
              <p className="stat-label">Active files shared by others</p>
            </Link>
            <Link to="/shared-by-me" className="stat-card stat-card-link">
              <h3>Shared By Me</h3>
              <p className="stat-value">{stats.sharedByMe}</p>
              <p className="stat-label">Active outgoing shares</p>
            </Link>
            <div className="stat-card">
              <h3>Storage Used</h3>
              <p className="stat-value">{formatFileSize(stats.storageUsed)}</p>
              <p className="stat-label">Total storage occupied</p>
            </div>
          </div>

          <div className="dashboard-actions">
            <Link to="/upload" className="action-button action-button-primary">
              ➕ Upload New File
            </Link>
            <Link to="/my-files" className="action-button action-button-secondary">
              📁 View My Files
            </Link>
            <Link to="/shared-with-me" className="action-button action-button-secondary">
              📥 Shared With Me
            </Link>
            <Link to="/activity" className="action-button action-button-secondary">
              📜 Audit Trail
            </Link>
          </div>

          {recentFiles.length > 0 && (
            <div className="recent-files-section" style={{ marginTop: '2rem', background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Recent Uploads</h3>
                <Link to="/my-files" style={{ fontSize: '0.875rem', color: '#2563eb', fontWeight: 500 }}>
                  View All Files →
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentFiles.map(file => (
                  <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 500, color: '#334155' }}>📄 {file.original_name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{formatFileSize(file.file_size)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Dashboard
