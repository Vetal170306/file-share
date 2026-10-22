const fs = require('fs')
const path = require('path')
const pool = require('./config/database')

async function runMigrationV2() {
  const connection = await pool.getConnection()
  try {
    console.log('Running Migration V2 for SecureShare AI...')
    
    // 1. Create file_versions
    await connection.query(`
      CREATE TABLE IF NOT EXISTS file_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_id INT NOT NULL,
        version_number INT NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(512) NOT NULL,
        file_size BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        uploaded_by INT NOT NULL,
        change_summary VARCHAR(500) NULL DEFAULT 'Version update',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_file_id (file_id),
        INDEX idx_version_number (version_number),
        INDEX idx_uploaded_by (uploaded_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('✓ file_versions table ready')

    // 2. Create file_favorites
    await connection.query(`
      CREATE TABLE IF NOT EXISTS file_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_file_favorite (user_id, file_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_file_id (file_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('✓ file_favorites table ready')

    // 3. Create notifications
    await connection.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('✓ notifications table ready')

    // 4. Create security_events
    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100) NOT NULL,
        email VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        details TEXT NULL,
        severity ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_type (event_type),
        INDEX idx_email (email),
        INDEX idx_ip (ip_address),
        INDEX idx_severity (severity),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    console.log('✓ security_events table ready')

    // 5. Add current_version column if missing
    const [cols] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'secure_file_sharing' 
        AND TABLE_NAME = 'files' 
        AND COLUMN_NAME = 'current_version'
    `)
    if (cols.length === 0) {
      await connection.query(`
        ALTER TABLE files ADD COLUMN current_version INT DEFAULT 1 AFTER mime_type
      `)
      console.log('✓ Added current_version column to files table')
    } else {
      console.log('✓ current_version column already present')
    }

    const [tables] = await connection.query('SHOW TABLES')
    console.log('\nMigration V2 complete! Current tables in database:')
    tables.forEach(t => console.log(' -', Object.values(t)[0]))

    connection.release()
    process.exit(0)
  } catch (error) {
    console.error('✗ Migration V2 failed:', error)
    connection.release()
    process.exit(1)
  }
}

runMigrationV2()
