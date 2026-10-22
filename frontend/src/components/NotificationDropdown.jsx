import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import './NotificationDropdown.css'

const NotificationDropdown = ({ onClose }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchNotifications()

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const res = await api.get('/notifications')
      setNotifications(res.data.notifications || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Failed to mark all notifications read:', err)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'SHARE_RECEIVED': return '📥'
      case 'VERSION_ADDED': return '🕒'
      case 'SHARE_REVOKED': return '🚫'
      case 'SHARE_EXPIRING': return '⏳'
      case 'DOWNLOAD_ALERT': return '⬇️'
      case 'SECURITY_ALERT': return '🛡️'
      default: return '🔔'
    }
  }

  const formatTime = (dateStr) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-header">
        <div className="notification-header-title">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="notification-badge-pill">{unreadCount} new</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="mark-all-read-btn">
            Mark all read
          </button>
        )}
      </div>

      <div className="notification-list">
        {loading ? (
          <div className="notification-empty">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <span className="empty-bell-icon">🔔</span>
            <p>No notifications yet</p>
            <span className="empty-sub">You're all caught up!</span>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`notification-item ${!n.is_read ? 'unread' : ''}`}
            >
              <div className="notification-icon-box">
                {getNotificationIcon(n.type)}
              </div>
              <div className="notification-body">
                <div className="notification-title-row">
                  <h4 className="notif-title">{n.title}</h4>
                  <span className="notif-time">{formatTime(n.created_at)}</span>
                </div>
                <p className="notif-message">{n.message}</p>
                {n.link && (
                  <Link
                    to={n.link}
                    onClick={() => {
                      if (!n.is_read) handleMarkAsRead(n.id, { stopPropagation: () => {} })
                      onClose()
                    }}
                    className="notif-action-link"
                  >
                    View Details →
                  </Link>
                )}
              </div>
              {!n.is_read && (
                <button
                  onClick={(e) => handleMarkAsRead(n.id, e)}
                  className="mark-single-read-dot"
                  title="Mark as read"
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default NotificationDropdown
