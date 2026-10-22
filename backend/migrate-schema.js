const fs = require('fs')
const path = require('path')
const pool = require('./config/database')

async function runSchema() {
  const connection = await pool.getConnection()
  try {
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf8')
    
    // Remove multi-line comments and single line comments
    const cleanSql = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//gm, '')

    const statements = cleanSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 40) + '...')
      await connection.query(statement)
    }

    const [tables] = await connection.query('SHOW TABLES')
    console.log('✓ Success! Total tables in DB:', tables.length)
    tables.forEach(t => console.log('  -', Object.values(t)[0]))

    connection.release()
    process.exit(0)
  } catch (error) {
    console.error('✗ Schema execution failed:', error)
    connection.release()
    process.exit(1)
  }
}

runSchema()
