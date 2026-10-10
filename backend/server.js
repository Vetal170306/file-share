const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const fileRoutes = require('./routes/files')
const shareRoutes = require('./routes/shares')
const activityRoutes = require('./routes/activity')
const adminRoutes = require('./routes/admin')
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

app.use(errorHandler)

app.get('/', (req, res) => {
  res.json({ message: 'Secure File Sharing API' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV}`)
})
