-- SecureShare AI - Database Migration V2
-- Adds support for File Versions, Notifications, Favorites, and Security Monitoring

USE secure_file_sharing;

-- 1. File Versions Table (Phase 3)
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

-- 2. Favorites Table (Phase 2)
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

-- 3. Notifications Table (Phase 4)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'SHARE_RECEIVED', 'VERSION_ADDED', 'SHARE_EXPIRING', 'SHARE_REVOKED', 'DOWNLOAD_ALERT', 'SECURITY_ALERT'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255) NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Security Events / Failed Logins Log Table (Phase 6)
CREATE TABLE IF NOT EXISTS security_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL, -- 'FAILED_LOGIN', 'SUSPICIOUS_ACCESS', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'SESSION_REVOKED'
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

-- 5. Add version column to files table if not already existing
SET @column_exists := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'secure_file_sharing' 
      AND TABLE_NAME = 'files' 
      AND COLUMN_NAME = 'current_version'
);

SET @sql_statement := IF(@column_exists = 0, 
    'ALTER TABLE files ADD COLUMN current_version INT DEFAULT 1 AFTER mime_type', 
    'SELECT "column current_version already exists"'
);

PREPARE stmt FROM @sql_statement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
