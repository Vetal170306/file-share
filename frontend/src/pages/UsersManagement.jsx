import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import './AdminDashboard.css'

const UsersManagement = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await api.get('/admin/users')
      setUsers(res.data.users || [])
      setError('')
    } catch (err) {
      setError('Failed to load user accounts')
      console.error('Admin users error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus })
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      setSuccessMsg(`User status updated to ${newStatus}`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user status')
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to ${newRole}?`)) return
    try {
      await api.patch(`/admin/users/${userId}/status`, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setSuccessMsg(`User role changed to ${newRole}`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role')
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userEmail}"? All their files and shares will be removed.`)) {
      return
    }

    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers(users.filter(u => u.id !== userId))
      setSuccessMsg(`User ${userEmail} deleted successfully`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user')
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
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <div className="admin-badge">🛡️ Administrator Console</div>
          <h1>User Accounts Management</h1>
          <p className="page-subtitle">View, update status, manage roles, or remove accounts</p>
        </div>
        <div className="admin-actions-bar">
          <Link to="/admin" className="btn-refresh" style={{ textDecoration: 'none' }}>
            ⬅️ Back to Admin
          </Link>
          <button onClick={fetchUsers} className="btn-refresh">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {successMsg && <div className="success-banner">{successMsg}</div>}

      <div className="search-container">
        <input
          type="text"
          placeholder="🔍 Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading user list...</p>
        </div>
      ) : (
        <div className="shares-table-container">
          <table className="shares-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Files Stored</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div>
                        <strong>{u.name}</strong> {isSelf && <span className="badge-pill pill-view">(You)</span>}
                      </div>
                      <span className="sub-text">{u.email}</span>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={isSelf}
                        className="select-filter"
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, e.target.value)}
                        disabled={isSelf}
                        className="select-filter"
                        style={{
                          padding: '0.3rem 0.5rem',
                          fontSize: '0.8rem',
                          borderColor: u.status === 'ACTIVE' ? '#22c55e' : u.status === 'SUSPENDED' ? '#ef4444' : '#cbd5e1'
                        }}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </td>
                    <td>
                      <div>{u.file_count || 0} files</div>
                      <span className="sub-text">{formatFileSize(u.storage_used)}</span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td className="col-actions">
                      {!isSelf && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="btn-action btn-revoke"
                          title="Delete User"
                        >
                          🗑️ Delete
                        </button>
                      )}
                      {isSelf && <span className="sub-text">Current Account</span>}
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default UsersManagement
