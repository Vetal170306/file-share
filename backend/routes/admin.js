const express = require('express')
const router = express.Router()
const {
  getUsers,
  updateUserStatus,
  deleteUser,
  getStatistics,
  getSecurityEvents,
  getAdminActivity
} = require('../controllers/adminController')
const { auth, adminAuth } = require('../middleware/auth')

// All routes require authentication AND admin privileges
router.use(auth, adminAuth)

router.get('/users', getUsers)
router.patch('/users/:id', updateUserStatus)
router.patch('/users/:id/status', updateUserStatus)
router.delete('/users/:id', deleteUser)
router.get('/statistics', getStatistics)
router.get('/security-events', getSecurityEvents)
router.get('/activity', getAdminActivity)

module.exports = router
