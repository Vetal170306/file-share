import { useAuth } from '../context/AuthContext'
import './Profile.css'

const Profile = () => {
  const { user } = useAuth()

  return (
    <div className="profile-page">
      <div className="profile-top-header">
        <div>
          <div className="badge-row">
            <span className="badge badge-brand">Security & Identity</span>
            <span className="file-count-indicator">Account Settings</span>
          </div>
          <h1 className="page-heading">User Profile & Security Credentials</h1>
          <p className="page-sub">Manage your security posture, view storage policies, and inspect active credentials</p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Profile Card */}
        <div className="profile-avatar-card glass-card">
          <div className="avatar-huge-circle">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="profile-card-name">{user?.name}</h2>
          <span className="profile-card-email">{user?.email}</span>
          <div className="profile-card-badges">
            <span className={`badge ${user?.role === 'ADMIN' ? 'badge-warning' : 'badge-brand'}`}>
              {user?.role === 'ADMIN' ? '🛡️ Administrator' : '👤 Standard User'}
            </span>
            <span className="badge badge-success">
              ● {user?.status || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Account Information & Security Guidelines */}
        <div className="profile-details-column">
          <div className="account-details-card glass-card">
            <h3 className="section-title">👤 Account Information</h3>
            <div className="details-info-grid">
              <div className="info-cell">
                <span className="info-cell-label">Display Name</span>
                <span className="info-cell-val">{user?.name}</span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Primary Email</span>
                <span className="info-cell-val">{user?.email}</span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Account Status</span>
                <span className="info-cell-val">
                  <span className="badge badge-success">{user?.status || 'ACTIVE'}</span>
                </span>
              </div>
              <div className="info-cell">
                <span className="info-cell-label">Role Privilege (RBAC)</span>
                <span className="info-cell-val">
                  {user?.role === 'ADMIN' ? 'Full System Administrator' : 'Standard User Vault'}
                </span>
              </div>
            </div>
          </div>

          <div className="security-guidelines-card glass-card">
            <h3 className="section-title">🔒 Platform Security Policies</h3>
            <ul className="guidelines-list">
              <li>
                <span className="guideline-icon">🛡️</span>
                <div>
                  <strong>End-to-End File Permissions:</strong> When sharing files, enforce "View Only" to prevent unauthorized local file downloads.
                </div>
              </li>
              <li>
                <span className="guideline-icon">⏱️</span>
                <div>
                  <strong>Automatic Share Expirations:</strong> Always attach time-to-live (TTL) expiry timestamps on sensitive files.
                </div>
              </li>
              <li>
                <span className="guideline-icon">🔑</span>
                <div>
                  <strong>Passcode Encryption:</strong> Secure shares with standalone access passwords when sharing outside your direct team.
                </div>
              </li>
              <li>
                <span className="guideline-icon">📜</span>
                <div>
                  <strong>Audit Log Telemetry:</strong> All downloads, views, and versions are cryptographically indexed in the Audit Trail.
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
