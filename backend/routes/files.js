const express = require('express')
const router = express.Router()
const {
  uploadFile,
  getFiles,
  toggleFavorite,
  uploadNewVersion,
  getVersionHistory,
  downloadVersion,
  restoreVersion,
  previewFile,
  downloadFile,
  deleteFile
} = require('../controllers/fileController')
const { auth } = require('../middleware/auth')
const upload = require('../middleware/upload')

router.post('/upload', auth, upload.single('file'), uploadFile)
router.get('/', auth, getFiles)
router.post('/:id/favorite', auth, toggleFavorite)
router.post('/:id/version', auth, upload.single('file'), uploadNewVersion)
router.get('/:id/versions', auth, getVersionHistory)
router.get('/:id/versions/:versionId/download', auth, downloadVersion)
router.post('/:id/versions/:versionId/restore', auth, restoreVersion)
router.get('/:id/preview', auth, previewFile)
router.get('/:id/download', auth, downloadFile)
router.delete('/:id', auth, deleteFile)

module.exports = router
