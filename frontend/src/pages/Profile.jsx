import { useAuth } from '../context/AuthContext'
import './Profile.css'

const Profile = () => {
  const { user } = useAuth()

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>👤 User Profile & Security</h1>
        <p className="page-subtitle">Your personal account details and credentials</p>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="avatar-circle">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <h2 className="profile-user-name">{user?.name}</h2>
          <span className="profile-email">{user?.email}</span>
          <span className={`badge-pill ${user?.role === 'ADMIN' ? 'pill-revoke' : 'pill-upload'}`} style={{ marginTop: '0.5rem' }}>
            {user?.role} ROLE
          </span>
        </div>

        <div className="profile-details-card">
          <h3>Account Information</h3>
          <div className="profile-info-grid">
            <div className="info-field">
              <span className="field-label">Full Name</span>
              <span className="field-val">{user?.name}</span>
            </div>
            <div className="info-field">
              <span className="field-label">Email Address</span>
              <span className="field-val">{user?.email}</span>
            </div>
            <div className="info-field">
              <span className="field-label">Account Status</span>
              <span className="field-val">
                <span className="badge badge-status-active">{user?.status || 'ACTIVE'}</span>
              </span>
            </div>
            <div className="info-field">
              <span className="field-label">Role Privilege</span>
              <span className="field-val">{user?.role === 'ADMIN' ? 'Full Administrator' : 'Standard User'}</span>
            </div>
          </div>

          <div className="security-section">
            <h3>🔒 Security Best Practices</h3>
            <ul className="security-tips">
              <li>Always set expiration periods on sensitive file shares.</li>
              <li>Use password protection for shared files containing confidential data.</li>
              <li>Revoke share permissions when links are no longer needed.</li>
              <li>Monitor your activity log regularly for unauthorized access.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
