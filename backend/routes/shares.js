const express = require('express')
const router = express.Router()
const { createShare, getReceivedShares, getSentShares, accessShare, revokeShare } = require('../controllers/shareController')
const { auth } = require('../middleware/auth')

router.post('/', auth, createShare)
router.get('/received', auth, getReceivedShares)
router.get('/sent', auth, getSentShares)
router.post('/:id/access', auth, accessShare)
router.delete('/:id/revoke', auth, revokeShare)

module.exports = router
