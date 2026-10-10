const pool = require('./config/database')

async function testConnection() {
  try {
    console.log('Testing database connection...')
    console.log('Database Config:')
    console.log('Host:', process.env.DB_HOST)
    console.log('User:', process.env.DB_USER)
    console.log('Database:', process.env.DB_NAME)
    console.log('Password:', process.env.DB_PASSWORD ? '***SET***' : '***NOT SET***')
    console.log('')

    const connection = await pool.getConnection()
    console.log('✓ Database connection successful!')
    
    const [rows] = await connection.query('SELECT VERSION() as version')
    console.log('✓ MySQL Version:', rows[0].version)
    
    const [tables] = await connection.query('SHOW TABLES')
    console.log('✓ Tables found:', tables.length)
    tables.forEach(table => {
      const tableName = Object.values(table)[0]
      console.log('  -', tableName)
    })
    
    connection.release()
    console.log('\n✓ All database tests passed!')
    process.exit(0)
  } catch (error) {
    console.error('✗ Database connection failed!')
    console.error('Error:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nPossible solutions:')
      console.error('1. Make sure MySQL server is running')
      console.error('2. Check if MySQL is installed')
      console.error('3. Verify the host and port in .env file')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nPossible solutions:')
      console.error('1. Check DB_USER and DB_PASSWORD in .env file')
      console.error('2. Make sure the MySQL user has proper permissions')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nPossible solutions:')
      console.error('1. Run the database schema: mysql -u root -p < database/schema.sql')
      console.error('2. Check if database name in .env matches the schema')
    }
    
    process.exit(1)
  }
}

testConnection()
