import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          SecureShare
        </Link>
        
        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/dashboard" className="navbar-link">Dashboard</Link>
              <Link to="/my-files" className="navbar-link">My Files</Link>
              <Link to="/upload" className="navbar-link">Upload</Link>
              <Link to="/shared-with-me" className="navbar-link">Shared With Me</Link>
              <Link to="/shared-by-me" className="navbar-link">Shared By Me</Link>
              <Link to="/activity" className="navbar-link">Activity</Link>
              {user.role === 'ADMIN' && (
                <Link to="/admin" className="navbar-link admin-link">Admin</Link>
              )}
              <Link to="/profile" className="navbar-link">Profile</Link>
              <button onClick={logout} className="navbar-button navbar-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/register" className="navbar-button navbar-register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
