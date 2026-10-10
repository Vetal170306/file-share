const fs = require('fs')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file

    const [result] = await pool.query(
      'INSERT INTO files (owner_id, original_name, stored_name, file_path, file_size, mime_type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, originalname, filename, filePath, size, mimetype]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_UPLOAD',
      fileId: result.insertId,
      details: { originalName: originalname, size, mimeType: mimetype },
      ipAddress: req.ip
    })

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: result.insertId,
        original_name: originalname,
        file_size: size,
        mime_type: mimetype
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ message: 'File upload failed' })
  }
}

const getFiles = async (req, res) => {
  try {
    const [files] = await pool.query(
      'SELECT id, original_name, file_size, mime_type, uploaded_at FROM files WHERE owner_id = ? ORDER BY uploaded_at DESC',
      [req.user.id]
    )

    res.json({ files })
  } catch (error) {
    console.error('Get files error:', error)
    res.status(500).json({ message: 'Failed to get files' })
  }
}

const downloadFile = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query(
      'SELECT * FROM files WHERE id = ?',
      [id]
    )

    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' })
    }

    await logActivity({
      userId: req.user.id,
      action: 'FILE_DOWNLOAD',
      fileId: file.id,
      details: { originalName: file.original_name },
      ipAddress: req.ip
    })

    res.download(file.file_path, file.original_name)
  } catch (error) {
    console.error('Download error:', error)
    res.status(500).json({ message: 'File download failed' })
  }
}

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query(
      'SELECT * FROM files WHERE id = ?',
      [id]
    )

    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Delete record from DB
    await pool.query('DELETE FROM files WHERE id = ?', [id])

    // Delete file from disk if exists
    if (fs.existsSync(file.file_path)) {
      fs.unlink(file.file_path, (err) => {
        if (err) console.error('Error removing local file:', err)
      })
    }

    await logActivity({
      userId: req.user.id,
      action: 'FILE_DELETE',
      fileId: null,
      details: { deletedFileId: id, originalName: file.original_name },
      ipAddress: req.ip
    })

    res.json({ message: 'File deleted successfully' })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ message: 'File deletion failed' })
  }
}

module.exports = { uploadFile, getFiles, downloadFile, deleteFile }
