import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/dashboard" />
  }

  return children
}

export default AdminRoute
