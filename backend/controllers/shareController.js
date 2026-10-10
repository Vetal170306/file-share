const bcrypt = require('bcryptjs')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLogger')

const createShare = async (req, res) => {
  try {
    const { file_id, receiver_email, permission = 'view', password, expires_at, expires_in_hours } = req.body

    if (!file_id || !receiver_email) {
      return res.status(400).json({ message: 'File ID and receiver email are required' })
    }

    // Verify file ownership
    const [files] = await pool.query(
      'SELECT * FROM files WHERE id = ?',
      [file_id]
    )

    if (files.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = files[0]
    if (file.owner_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: You do not own this file' })
    }

    // Find receiver
    const [receivers] = await pool.query(
      'SELECT id, name, email FROM users WHERE email = ?',
      [receiver_email.trim().toLowerCase()]
    )

    if (receivers.length === 0) {
      return res.status(404).json({ message: 'User with this email was not found' })
    }

    const receiver = receivers[0]

    if (receiver.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot share a file with yourself' })
    }

    // Calculate expiration if provided
    let calculatedExpiresAt = null
    if (expires_at) {
      calculatedExpiresAt = new Date(expires_at)
    } else if (expires_in_hours && !isNaN(expires_in_hours) && Number(expires_in_hours) > 0) {
      calculatedExpiresAt = new Date(Date.now() + Number(expires_in_hours) * 60 * 60 * 1000)
    }

    // Hash password if provided
    let passwordHash = null
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10)
    }

    const safePermission = permission === 'download' ? 'download' : 'view'

    const [result] = await pool.query(
      `INSERT INTO shares (file_id, sender_id, receiver_id, permission, password_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [file_id, req.user.id, receiver.id, safePermission, passwordHash, calculatedExpiresAt]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_SHARE_CREATE',
      fileId: file_id,
      details: {
        shareId: result.insertId,
        receiverEmail: receiver.email,
        permission: safePermission,
        hasPassword: !!passwordHash,
        expiresAt: calculatedExpiresAt
      },
      ipAddress: req.ip
    })

    res.status(201).json({
      message: 'File shared successfully',
      share: {
        id: result.insertId,
        file_id,
        receiver_name: receiver.name,
        receiver_email: receiver.email,
        permission: safePermission,
        has_password: !!passwordHash,
        expires_at: calculatedExpiresAt
      }
    })
  } catch (error) {
    console.error('Share creation error:', error)
    res.status(500).json({ message: 'Share creation failed' })
  }
}

const getReceivedShares = async (req, res) => {
  try {
    const [shares] = await pool.query(
      `SELECT 
        s.id,
        s.file_id,
        s.permission,
        s.expires_at,
        s.created_at,
        s.revoked_at,
        (s.password_hash IS NOT NULL) AS is_password_protected,
        f.original_name,
        f.file_size,
        f.mime_type,
        f.uploaded_at,
        u.name AS sender_name,
        u.email AS sender_email,
        CASE 
          WHEN s.revoked_at IS NOT NULL THEN 'REVOKED'
          WHEN s.expires_at IS NOT NULL AND s.expires_at < NOW() THEN 'EXPIRED'
          ELSE 'ACTIVE'
        END AS status
      FROM shares s
      JOIN files f ON s.file_id = f.id
      JOIN users u ON s.sender_id = u.id
      WHERE s.receiver_id = ?
      ORDER BY s.created_at DESC`,
      [req.user.id]
    )

    res.json({ shares })
  } catch (error) {
    console.error('Get received shares error:', error)
    res.status(500).json({ message: 'Failed to get received shares' })
  }
}

const getSentShares = async (req, res) => {
  try {
    const [shares] = await pool.query(
      `SELECT 
        s.id,
        s.file_id,
        s.permission,
        s.expires_at,
        s.created_at,
        s.revoked_at,
        (s.password_hash IS NOT NULL) AS is_password_protected,
        f.original_name,
        f.file_size,
        f.mime_type,
        u.name AS receiver_name,
        u.email AS receiver_email,
        CASE 
          WHEN s.revoked_at IS NOT NULL THEN 'REVOKED'
          WHEN s.expires_at IS NOT NULL AND s.expires_at < NOW() THEN 'EXPIRED'
          ELSE 'ACTIVE'
        END AS status
      FROM shares s
      JOIN files f ON s.file_id = f.id
      JOIN users u ON s.receiver_id = u.id
      WHERE s.sender_id = ?
      ORDER BY s.created_at DESC`,
      [req.user.id]
    )

    res.json({ shares })
  } catch (error) {
    console.error('Get sent shares error:', error)
    res.status(500).json({ message: 'Failed to get sent shares' })
  }
}

const accessShare = async (req, res) => {
  try {
    const { id } = req.params
    const { password, action } = req.body || {}

    const [shares] = await pool.query(
      `SELECT s.*, f.original_name, f.stored_name, f.file_path, f.file_size, f.mime_type
       FROM shares s
       JOIN files f ON s.file_id = f.id
       WHERE s.id = ?`,
      [id]
    )

    if (shares.length === 0) {
      return res.status(404).json({ message: 'Share link not found' })
    }

    const share = shares[0]

    // Verify receiver access or admin
    if (share.receiver_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied to this shared file' })
    }

    // Check revoked
    if (share.revoked_at) {
      return res.status(410).json({ message: 'This shared link has been revoked by the owner' })
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return res.status(410).json({ message: 'This shared link has expired' })
    }

    // Check password if set
    if (share.password_hash) {
      if (!password) {
        return res.status(401).json({ message: 'Password required to access this file', requiresPassword: true })
      }
      const isMatch = await bcrypt.compare(password, share.password_hash)
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password', requiresPassword: true })
      }
    }

    await logActivity({
      userId: req.user.id,
      action: action === 'download' ? 'FILE_SHARE_DOWNLOAD' : 'FILE_SHARE_VIEW',
      fileId: share.file_id,
      details: { shareId: share.id, permission: share.permission },
      ipAddress: req.ip
    })

    if (action === 'download' || req.query.download === 'true') {
      if (share.permission !== 'download') {
        return res.status(403).json({ message: 'You only have permission to view this file, not download it' })
      }
      return res.download(share.file_path, share.original_name)
    }

    res.json({
      message: 'Share accessed successfully',
      file: {
        id: share.file_id,
        original_name: share.original_name,
        file_size: share.file_size,
        mime_type: share.mime_type,
        permission: share.permission
      }
    })
  } catch (error) {
    console.error('Share access error:', error)
    res.status(500).json({ message: 'Share access failed' })
  }
}

const revokeShare = async (req, res) => {
  try {
    const { id } = req.params

    const [shares] = await pool.query(
      'SELECT * FROM shares WHERE id = ?',
      [id]
    )

    if (shares.length === 0) {
      return res.status(404).json({ message: 'Share not found' })
    }

    const share = shares[0]

    if (share.sender_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Only the sender can revoke this share' })
    }

    await pool.query(
      'UPDATE shares SET revoked_at = NOW() WHERE id = ?',
      [id]
    )

    await logActivity({
      userId: req.user.id,
      action: 'FILE_SHARE_REVOKE',
      fileId: share.file_id,
      details: { shareId: id },
      ipAddress: req.ip
    })

    res.json({ message: 'Share access revoked successfully' })
  } catch (error) {
    console.error('Share revocation error:', error)
    res.status(500).json({ message: 'Share revocation failed' })
  }
}

module.exports = { createShare, getReceivedShares, getSentShares, accessShare, revokeShare }
