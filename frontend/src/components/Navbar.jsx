import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationDropdown from './NotificationDropdown'
import api from '../utils/api'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const location = useLocation()

  useEffect(() => {
    if (user) {
      fetchUnreadCount()
      const interval = setInterval(fetchUnreadCount, 25000) // Poll for notifications every 25s
      return () => clearInterval(interval)
    }
  }, [user, location.pathname])

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications')
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      // ignore
    }
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to="/" className="navbar-brand">
          <div className="brand-logo-icon">🛡️</div>
          <div className="brand-text-block">
            <span className="brand-title">SecureShare<span className="brand-ai-sparkle">AI</span></span>
          </div>
        </Link>

        {/* Navigation Menu */}
        <nav className="navbar-menu">
          {user ? (
            <>
              <Link to="/dashboard" className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}>
                Dashboard
              </Link>
              <Link to="/my-files" className={`navbar-link ${isActive('/my-files') ? 'active' : ''}`}>
                My Files
              </Link>
              <Link to="/upload" className={`navbar-link ${isActive('/upload') ? 'active' : ''}`}>
                Upload
              </Link>
              <Link to="/shared-with-me" className={`navbar-link ${isActive('/shared-with-me') ? 'active' : ''}`}>
                Shared With Me
              </Link>
              <Link to="/shared-by-me" className={`navbar-link ${isActive('/shared-by-me') ? 'active' : ''}`}>
                Shared By Me
              </Link>
              <Link to="/activity" className={`navbar-link ${isActive('/activity') ? 'active' : ''}`}>
                Audit Trail
              </Link>

              {user.role === 'ADMIN' && (
                <Link to="/admin" className={`navbar-link admin-nav-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                  🛡️ Security Center
                </Link>
              )}

              {/* Notification Bell */}
              <div className="notification-bell-wrapper">
                <button
                  type="button"
                  className={`notification-bell-btn ${showNotifications ? 'active' : ''}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                  title="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="bell-badge-count">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {showNotifications && (
                  <NotificationDropdown onClose={() => {
                    setShowNotifications(false)
                    fetchUnreadCount()
                  }} />
                )}
              </div>

              {/* User Profile Pill */}
              <Link to="/profile" className="navbar-user-pill" title="View Profile">
                <div className="user-avatar-circle">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-pill-name">{user.name}</span>
                {user.role === 'ADMIN' && <span className="admin-mini-badge">ADMIN</span>}
              </Link>

              <button onClick={logout} className="navbar-logout-btn" title="Logout">
                Logout
              </button>
            </>
          ) : (
            <div className="auth-nav-buttons">
              <Link to="/login" className="navbar-link">
                Sign In
              </Link>
              <Link to="/register" className="btn-primary btn-sm">
                Get Started ➔
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Navbar
