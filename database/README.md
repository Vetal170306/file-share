# Database Setup Instructions

## Prerequisites
- MySQL Server installed and running
- MySQL root user access

## Setup Steps

### 1. Update Database Credentials
Edit `backend/.env` file with your MySQL credentials:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Vetal@2006
DB_NAME=secure_file_sharing
```

### 2. Execute the Schema
Run the SQL schema file to create the database and tables:

**Option 1: Using MySQL Command Line**
```bash
mysql -u root -p < database/schema.sql
```

**Option 2: Using MySQL Workbench**
- Open MySQL Workbench
- Connect to your MySQL server
- Open `database/schema.sql` file
- Execute the script

**Option 3: Using phpMyAdmin**
- Open phpMyAdmin
- Go to SQL tab
- Copy and paste the contents of `database/schema.sql`
- Click Go

### 3. Verify Database Creation
After execution, verify the database was created:
```sql
USE secure_file_sharing;
SHOW TABLES;
```

You should see:
- users
- files
- shares
- activity_logs

### 4. Default Admin Account
The schema creates a default admin account:
- Email: admin@securefile.com
- Password: admin123

**IMPORTANT:** Change this password immediately after first login!

## Database Schema

### Users Table
- id (Primary Key)
- name
- email (Unique)
- password_hash
- role (USER/ADMIN)
- status (ACTIVE/INACTIVE/SUSPENDED)
- created_at

### Files Table
- id (Primary Key)
- owner_id (Foreign Key → users)
- original_name
- stored_name
- file_path
- file_size
- mime_type
- uploaded_at

### Shares Table
- id (Primary Key)
- file_id (Foreign Key → files)
- sender_id (Foreign Key → users)
- receiver_id (Foreign Key → users)
- permission (view/download)
- password_hash (Optional)
- expires_at (Optional)
- created_at
- revoked_at (Optional)

### Activity Logs Table
- id (Primary Key)
- user_id (Foreign Key → users)
- action
- file_id (Foreign Key → files)
- details
- ip_address
- created_at

## Security Notes
- Never commit the `.env` file with real passwords
- Use strong passwords in production
- Change the default admin password immediately
- Regularly backup your database
- Consider using MySQL user with limited permissions for the application
