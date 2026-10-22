const express = require('express')
const router = express.Router()
const { summarizeDocument, askDocumentQuestion } = require('../controllers/aiController')
const { auth } = require('../middleware/auth')

router.get('/:fileId/summary', auth, summarizeDocument)
router.post('/:fileId/ask', auth, askDocumentQuestion)

module.exports = router
