import { Link } from 'react-router-dom'
import './Landing.css'

const Landing = () => {
  return (
    <div className="landing">
      <div className="landing-container">
        <div className="landing-content">
          <h1 className="landing-title">Secure File Sharing System</h1>
          <p className="landing-subtitle">
            Share files securely with your peers. Upload, manage, and share files with confidence.
          </p>
          <div className="landing-buttons">
            <Link to="/register" className="landing-button landing-button-primary">
              Get Started
            </Link>
            <Link to="/login" className="landing-button landing-button-secondary">
              Login
            </Link>
          </div>
          
          <div className="landing-features">
            <div className="feature-card">
              <h3>Secure Upload</h3>
              <p>Upload files with advanced security measures</p>
            </div>
            <div className="feature-card">
              <h3>Controlled Sharing</h3>
              <p>Share files with specific users and set permissions</p>
            </div>
            <div className="feature-card">
              <h3>Activity Tracking</h3>
              <p>Monitor all file activities and access logs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Landing
