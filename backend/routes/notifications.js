const express = require('express')
const router = express.Router()
const { getNotifications, markAsRead, markAllAsRead, deleteNotification } = require('../controllers/notificationController')
const { auth } = require('../middleware/auth')

router.get('/', auth, getNotifications)
router.put('/:id/read', auth, markAsRead)
router.put('/read-all', auth, markAllAsRead)
router.delete('/:id', auth, deleteNotification)

module.exports = router
