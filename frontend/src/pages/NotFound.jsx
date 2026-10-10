import { Link } from 'react-router-dom'
import './Page.css'

const NotFound = () => {
  return (
    <div className="page" style={{ textAlign: 'center', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '4rem', color: '#e74c3c' }}>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>
        Go to Home
      </Link>
    </div>
  )
}

export default NotFound
