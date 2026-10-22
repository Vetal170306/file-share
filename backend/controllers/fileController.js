const fs = require('fs')
const path = require('path')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')
const { createNotification } = require('../utils/notificationService')

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file

    const [result] = await pool.query(
      'INSERT INTO files (owner_id, original_name, stored_name, file_path, file_size, mime_type, current_version) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [req.user.id, originalname, filename, filePath, size, mimetype]
    )

    // Also record Version 1 in file_versions table
    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, stored_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES (?, 1, ?, ?, ?, ?, ?, 'Initial upload')`,
      [result.insertId, filename, filePath, size, mimetype, req.user.id]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_UPLOAD',
      fileId: result.insertId,
      details: { originalName: originalname, size, mimeType: mimetype, version: 1 },
      ipAddress: req.ip
    })

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: result.insertId,
        original_name: originalname,
        file_size: size,
        mime_type: mimetype,
        current_version: 1
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
      `SELECT 
        f.id, 
        f.original_name, 
        f.file_size, 
        f.mime_type, 
        f.uploaded_at,
        COALESCE(f.current_version, 1) AS current_version,
        (fav.id IS NOT NULL) AS is_favorite,
        (SELECT COUNT(*) FROM file_versions v WHERE v.file_id = f.id) AS version_count,
        (SELECT COUNT(*) FROM shares s WHERE s.file_id = f.id AND s.revoked_at IS NULL AND (s.expires_at IS NULL OR s.expires_at > NOW())) AS active_shares_count
      FROM files f
      LEFT JOIN file_favorites fav ON f.id = fav.file_id AND fav.user_id = ?
      WHERE f.owner_id = ?
      ORDER BY f.uploaded_at DESC`,
      [req.user.id, req.user.id]
    )

    res.json({ files })
  } catch (error) {
    console.error('Get files error:', error)
    res.status(500).json({ message: 'Failed to get files' })
  }
}

const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query('SELECT id, owner_id FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const [existing] = await pool.query(
      'SELECT id FROM file_favorites WHERE user_id = ? AND file_id = ?',
      [req.user.id, id]
    )

    let isFavorite = false
    if (existing.length > 0) {
      await pool.query('DELETE FROM file_favorites WHERE id = ?', [existing[0].id])
      isFavorite = false
    } else {
      await pool.query('INSERT INTO file_favorites (user_id, file_id) VALUES (?, ?)', [req.user.id, id])
      isFavorite = true
    }

    res.json({
      message: isFavorite ? 'Added to favorites' : 'Removed from favorites',
      isFavorite
    })
  } catch (error) {
    console.error('Toggle favorite error:', error)
    res.status(500).json({ message: 'Failed to toggle favorite status' })
  }
}

const uploadNewVersion = async (req, res) => {
  try {
    const { id } = req.params
    const changeSummary = req.body.change_summary || 'Updated version'

    if (!req.file) {
      return res.status(400).json({ message: 'No new file uploaded for version' })
    }

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'Target file not found' })
    }

    const file = files[0]
    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Only owner can upload versions' })
    }

    const currentVer = file.current_version || 1
    const newVersionNumber = currentVer + 1
    const { originalname, filename, path: filePath, size, mimetype } = req.file

    // 1. Insert new version in file_versions
    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, stored_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, newVersionNumber, filename, filePath, size, mimetype, req.user.id, changeSummary]
    )

    // 2. Update files table with latest version details
    await pool.query(
      `UPDATE files 
       SET original_name = ?, stored_name = ?, file_path = ?, file_size = ?, mime_type = ?, current_version = ?, uploaded_at = NOW()
       WHERE id = ?`,
      [originalname, filename, filePath, size, mimetype, newVersionNumber, id]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_VERSION_UPLOAD',
      fileId: id,
      details: {
        originalName: originalname,
        newVersion: newVersionNumber,
        changeSummary
      },
      ipAddress: req.ip
    })

    // Notify any active share recipients about the new version
    const [activeShares] = await pool.query(
      `SELECT receiver_id FROM shares WHERE file_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
      [id]
    )

    for (const share of activeShares) {
      await createNotification({
        userId: share.receiver_id,
        type: 'VERSION_ADDED',
        title: 'File Updated to New Version',
        message: `A new version (v${newVersionNumber}) of "${originalname}" has been uploaded.`,
        link: '/shared-with-me'
      })
    }

    res.status(201).json({
      message: `Version ${newVersionNumber} uploaded successfully`,
      current_version: newVersionNumber,
      file: {
        id,
        original_name: originalname,
        file_size: size,
        mime_type: mimetype,
        current_version: newVersionNumber
      }
    })
  } catch (error) {
    console.error('Upload new version error:', error)
    res.status(500).json({ message: 'Failed to upload new version' })
  }
}

const getVersionHistory = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    // Verify access: owner, admin, or active share recipient
    let hasAccess = (file.owner_id === req.user.id || req.user.role === 'ADMIN')
    if (!hasAccess) {
      const [shares] = await pool.query(
        `SELECT id FROM shares WHERE file_id = ? AND receiver_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
        [id, req.user.id]
      )
      hasAccess = shares.length > 0
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to file version history' })
    }

    const [versions] = await pool.query(
      `SELECT 
        v.id,
        v.file_id,
        v.version_number,
        v.file_size,
        v.mime_type,
        v.change_summary,
        v.created_at,
        u.name AS uploader_name,
        u.email AS uploader_email,
        (v.version_number = f.current_version) AS is_current
      FROM file_versions v
      JOIN users u ON v.uploaded_by = u.id
      JOIN files f ON v.file_id = f.id
      WHERE v.file_id = ?
      ORDER BY v.version_number DESC`,
      [id]
    )

    res.json({
      file_id: id,
      original_name: file.original_name,
      current_version: file.current_version || 1,
      versions
    })
  } catch (error) {
    console.error('Get version history error:', error)
    res.status(500).json({ message: 'Failed to get version history' })
  }
}

const downloadVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    // Verify access
    let hasAccess = (file.owner_id === req.user.id || req.user.role === 'ADMIN')
    if (!hasAccess) {
      const [shares] = await pool.query(
        `SELECT permission FROM shares WHERE file_id = ? AND receiver_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
        [id, req.user.id]
      )
      if (shares.length > 0 && shares[0].permission === 'download') {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied: Download permission required' })
    }

    const [versions] = await pool.query(
      'SELECT * FROM file_versions WHERE id = ? AND file_id = ?',
      [versionId, id]
    )

    if (versions.length === 0) {
      return res.status(404).json({ message: 'Version record not found' })
    }

    const version = versions[0]
    if (!fs.existsSync(version.file_path)) {
      return res.status(404).json({ message: 'Physical file version not found on server' })
    }

    await logActivity({
      userId: req.user.id,
      action: 'FILE_VERSION_DOWNLOAD',
      fileId: id,
      details: { versionNumber: version.version_number, originalName: file.original_name },
      ipAddress: req.ip
    })

    const downloadName = `v${version.version_number}_${file.original_name}`
    res.download(version.file_path, downloadName)
  } catch (error) {
    console.error('Download version error:', error)
    res.status(500).json({ message: 'Failed to download file version' })
  }
}

const restoreVersion = async (req, res) => {
  try {
    const { id, versionId } = req.params

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]
    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Only owner can restore versions' })
    }

    const [versions] = await pool.query(
      'SELECT * FROM file_versions WHERE id = ? AND file_id = ?',
      [versionId, id]
    )

    if (versions.length === 0) {
      return res.status(404).json({ message: 'Version not found' })
    }

    const targetVersion = versions[0]

    // Create a new version entry representing the rollback action
    const newVersionNumber = (file.current_version || 1) + 1

    await pool.query(
      `INSERT INTO file_versions (file_id, version_number, stored_name, file_path, file_size, mime_type, uploaded_by, change_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        newVersionNumber,
        targetVersion.stored_name,
        targetVersion.file_path,
        targetVersion.file_size,
        targetVersion.mime_type,
        req.user.id,
        `Restored from Version ${targetVersion.version_number}`
      ]
    )

    // Update active file record
    await pool.query(
      `UPDATE files 
       SET stored_name = ?, file_path = ?, file_size = ?, mime_type = ?, current_version = ?, uploaded_at = NOW()
       WHERE id = ?`,
      [
        targetVersion.stored_name,
        targetVersion.file_path,
        targetVersion.file_size,
        targetVersion.mime_type,
        newVersionNumber,
        id
      ]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_VERSION_RESTORE',
      fileId: id,
      details: {
        restoredFromVersion: targetVersion.version_number,
        newVersionNumber
      },
      ipAddress: req.ip
    })

    res.json({
      message: `File successfully restored from version ${targetVersion.version_number} (now v${newVersionNumber})`,
      current_version: newVersionNumber
    })
  } catch (error) {
    console.error('Restore version error:', error)
    res.status(500).json({ message: 'Failed to restore file version' })
  }
}

const previewFile = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    // Check authorization: owner, admin, or shared recipient
    let hasAccess = (file.owner_id === req.user.id || req.user.role === 'ADMIN')
    if (!hasAccess) {
      const [shares] = await pool.query(
        `SELECT id FROM shares WHERE file_id = ? AND receiver_id = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`,
        [id, req.user.id]
      )
      hasAccess = shares.length > 0
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to preview this file' })
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ message: 'File not found on server' })
    }

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.original_name)}"`)
    fs.createReadStream(file.file_path).pipe(res)
  } catch (error) {
    console.error('Preview error:', error)
    res.status(500).json({ message: 'Failed to preview file' })
  }
}

const downloadFile = async (req, res) => {
  try {
    const { id } = req.params

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' })
    }

    if (!fs.existsSync(file.file_path)) {
      return res.status(404).json({ message: 'File not found on server' })
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

    const [files] = await pool.query('SELECT * FROM files WHERE id = ?', [id])
    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]

    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied' })
    }

    // Get all version file paths to remove from disk
    const [versions] = await pool.query('SELECT file_path FROM file_versions WHERE file_id = ?', [id])

    // Delete record from DB (cascades to file_versions, shares, favorites)
    await pool.query('DELETE FROM files WHERE id = ?', [id])

    // Delete main file from disk
    if (fs.existsSync(file.file_path)) {
      fs.unlink(file.file_path, () => {})
    }

    // Delete historical versions from disk
    versions.forEach(v => {
      if (v.file_path && fs.existsSync(v.file_path)) {
        fs.unlink(v.file_path, () => {})
      }
    })

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

module.exports = {
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
}
