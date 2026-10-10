const mysql = require('mysql2/promise')
require('dotenv').config()

// Handle empty password for MySQL connections
const dbPassword = process.env.DB_PASSWORD || ''

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: dbPassword,
  database: process.env.DB_NAME || 'secure_file_sharing',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

module.exports = pool
