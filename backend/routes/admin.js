const express = require('express')
const router = express.Router()
const { getUsers, updateUserStatus, deleteUser, getStatistics, getAdminActivity } = require('../controllers/adminController')
const { auth, adminAuth } = require('../middleware/auth')

router.get('/users', auth, adminAuth, getUsers)
router.patch('/users/:id/status', auth, adminAuth, updateUserStatus)
router.delete('/users/:id', auth, adminAuth, deleteUser)
router.get('/statistics', auth, adminAuth, getStatistics)
router.get('/activity', auth, adminAuth, getAdminActivity)

module.exports = router
