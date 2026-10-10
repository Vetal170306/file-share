const mysql = require('mysql2/promise')
const readline = require('readline')
require('dotenv').config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupDatabase() {
  console.log('=== Secure File Sharing - Database Setup ===\n')

  const dbHost = await question('MySQL Host (default: localhost): ') || 'localhost'
  const dbUser = await question('MySQL User (default: root): ') || 'root'
  const dbPassword = await question('MySQL Password: ')
  const dbName = await question('Database Name (default: secure_file_sharing): ') || 'secure_file_sharing'

  console.log('\nTesting connection...')

  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      user: dbUser,
      password: dbPassword
    })

    console.log('✓ Connection successful!')

    const [rows] = await connection.query('SHOW DATABASES LIKE ?', [dbName])
    
    if (rows.length === 0) {
      console.log(`\nDatabase '${dbName}' does not exist.`)
      const createDb = await question('Create it now? (y/n): ')
      
      if (createDb.toLowerCase() === 'y') {
        await connection.query(`CREATE DATABASE ${dbName}`)
        console.log(`✓ Database '${dbName}' created!`)
      } else {
        console.log('Please create the database manually and run the schema.')
        rl.close()
        process.exit(1)
      }
    } else {
      console.log(`✓ Database '${dbName}' exists.`)
    }

    await connection.end()

    console.log('\n=== Update your backend/.env file with these values ===')
    console.log(`DB_HOST=${dbHost}`)
    console.log(`DB_USER=${dbUser}`)
    console.log(`DB_PASSWORD=${dbPassword}`)
    console.log(`DB_NAME=${dbName}`)
    console.log('================================================\n')

    const updateEnv = await question('Update .env file now? (y/n): ')
    
    if (updateEnv.toLowerCase() === 'y') {
      const fs = require('fs')
      const path = require('path')
      
      const envPath = path.join(__dirname, '.env')
      let envContent = fs.readFileSync(envPath, 'utf8')
      
      envContent = envContent.replace(/DB_HOST=.*/, `DB_HOST=${dbHost}`)
      envContent = envContent.replace(/DB_USER=.*/, `DB_USER=${dbUser}`)
      envContent = envContent.replace(/DB_PASSWORD=.*/, `DB_PASSWORD=${dbPassword}`)
      envContent = envContent.replace(/DB_NAME=.*/, `DB_NAME=${dbName}`)
      
      fs.writeFileSync(envPath, envContent)
      console.log('✓ .env file updated!')
    }

    console.log('\nNext steps:')
    console.log('1. Run the database schema: mysql -u ' + dbUser + ' -p < database/schema.sql')
    console.log('2. Test connection: node test-db-connection.js')
    console.log('3. Start the backend: npm run dev')

    rl.close()
    process.exit(0)

  } catch (error) {
    console.error('✗ Connection failed!')
    console.error('Error:', error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nMake sure MySQL server is running.')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nCheck your username and password.')
    }
    
    rl.close()
    process.exit(1)
  }
}

setupDatabase()
