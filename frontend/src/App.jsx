import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MyFiles from './pages/MyFiles'
import UploadFile from './pages/UploadFile'
import SharedWithMe from './pages/SharedWithMe'
import SharedByMe from './pages/SharedByMe'
import Activity from './pages/Activity'
import Profile from './pages/Profile'
import AdminDashboard from './pages/AdminDashboard'
import UsersManagement from './pages/UsersManagement'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/my-files" element={
                <ProtectedRoute>
                  <MyFiles />
                </ProtectedRoute>
              } />
              
              <Route path="/upload" element={
                <ProtectedRoute>
                  <UploadFile />
                </ProtectedRoute>
              } />
              
              <Route path="/shared-with-me" element={
                <ProtectedRoute>
                  <SharedWithMe />
                </ProtectedRoute>
              } />
              
              <Route path="/shared-by-me" element={
                <ProtectedRoute>
                  <SharedByMe />
                </ProtectedRoute>
              } />
              
              <Route path="/activity" element={
                <ProtectedRoute>
                  <Activity />
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } />
              
              <Route path="/admin/users" element={
                <AdminRoute>
                  <UsersManagement />
                </AdminRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
