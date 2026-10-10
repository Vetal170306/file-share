const express = require('express')
const router = express.Router()
const { getActivity } = require('../controllers/activityController')
const { auth } = require('../middleware/auth')

router.get('/', auth, getActivity)

module.exports = router
