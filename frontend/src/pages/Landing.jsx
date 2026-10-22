import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

const Landing = () => {
  const { user } = useAuth()

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-badge-row">
          <span className="badge badge-ai">✨ Next-Generation AI File Platform</span>
          <span className="badge badge-success">🔒 End-to-End Access Control</span>
        </div>

        <h1 className="hero-main-title">
          Intelligent & Secure File Sharing Platform
        </h1>

        <p className="hero-description">
          SecureShare AI pairs cloud-grade file encryption, granular permission controls, and version tracking with an intelligent AI document assistant for instant summaries and Q&A.
        </p>

        <div className="hero-cta-group">
          {user ? (
            <Link to="/dashboard" className="btn-primary btn-hero">
              🚀 Open Dashboard ➔
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn-primary btn-hero">
                Get Started Free ➔
              </Link>
              <Link to="/login" className="btn-secondary btn-hero">
                Sign In to Vault
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="features-section">
        <div className="features-grid">
          <div className="feature-box glass-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#d8b4fe' }}>
              ✨
            </div>
            <h3 className="feature-title">AI Document Assistant</h3>
            <p className="feature-desc">
              Extract executive summaries, highlight key dates, auto-generate semantic tags, and ask questions directly grounded in your PDFs and documents.
            </p>
          </div>

          <div className="feature-box glass-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              🕒
            </div>
            <h3 className="feature-title">File Version Control</h3>
            <p className="feature-desc">
              Upload newer drafts of files without losing history. Inspect changelog notes, download older snapshots, or restore earlier versions anytime.
            </p>
          </div>

          <div className="feature-box glass-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' }}>
              🔐
            </div>
            <h3 className="feature-title">Granular Permissions</h3>
            <p className="feature-desc">
              Share files with View-Only or Download access, attach custom expiry timeouts, and protect links with standalone access passcodes.
            </p>
          </div>

          <div className="feature-box glass-card">
            <div className="feature-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
              🛡️
            </div>
            <h3 className="feature-title">SOC Security Center</h3>
            <p className="feature-desc">
              Immutable audit logs track all file downloads and logins. Administrators monitor real-time threat signals, failed logins, and manage RBAC.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Landing
