const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const fileRoutes = require('./routes/files')
const shareRoutes = require('./routes/shares')
const activityRoutes = require('./routes/activity')
const adminRoutes = require('./routes/admin')
const notificationRoutes = require('./routes/notifications')
const aiRoutes = require('./routes/ai')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/auth', authRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/shares', shareRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/ai', aiRoutes)

app.use(errorHandler)

app.get('/', (req, res) => {
  res.json({ message: 'SecureShare AI API - Intelligent & Secure File Sharing' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SecureShare AI Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})
