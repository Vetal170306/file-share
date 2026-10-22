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
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

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
      await api.patch(`/admin/users/${userId}`, { status: newStatus })
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
      await api.patch(`/admin/users/${userId}`, { role: newRole })
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setSuccessMsg(`User role updated to ${newRole}`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user role')
    }
  }

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userEmail}"? All their files, shares, and activity logs will be wiped.`)) {
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

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter !== 'all' && u.status !== statusFilter) return false
    return true
  })

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-warning">🛡️ Access Control & RBAC</span>
            <span className="file-count-indicator">{users.length} Registered Accounts</span>
          </div>
          <h1 className="page-heading">User Accounts & Roles</h1>
          <p className="page-sub">Manage user accounts, enforce status rules, revoke sessions, and configure permissions</p>
        </div>
        <div className="admin-actions-bar">
          <Link to="/admin" className="btn-secondary btn-sm">
            ⬅️ Security Center
          </Link>
          <button onClick={fetchUsers} className="btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}
      {successMsg && <div className="alert-box success">{successMsg}</div>}

      <div className="files-controls-bar glass-card">
        <div className="search-box-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-text-input"
          />
        </div>

        <div className="view-and-sort-controls">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="sort-dropdown"
          >
            <option value="all">All Roles</option>
            <option value="USER">Standard Users</option>
            <option value="ADMIN">Administrators</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sort-dropdown"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading-state">
          <div className="ai-glow-spinner"></div>
          <p>Retrieving user records...</p>
        </div>
      ) : (
        <div className="admin-table-wrapper glass-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Profile</th>
                <th>Role (RBAC)</th>
                <th>Account Status</th>
                <th>Storage Volume</th>
                <th>Joined Date</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-profile-cell">
                        <div className="user-avatar-mini">
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <strong>{u.name}</strong> {isSelf && <span className="badge badge-brand">(You)</span>}
                          <div className="meta-sub">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={isSelf}
                        className="severity-dropdown"
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
                        className="severity-dropdown"
                        style={{
                          color: u.status === 'ACTIVE' ? '#34d399' : u.status === 'SUSPENDED' ? '#f87171' : '#fbbf24'
                        }}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                    </td>
                    <td>
                      <div>{u.file_count || 0} files</div>
                      <span className="meta-sub">{formatFileSize(u.storage_used)}</span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                    <td>
                      {!isSelf ? (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          className="btn-danger btn-xs"
                          title="Delete User"
                        >
                          🗑️ Delete
                        </button>
                      ) : (
                        <span className="meta-sub">Current Admin</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="6" className="table-empty-td">
                    No users matching the specified search or filter criteria.
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
