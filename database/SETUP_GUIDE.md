# MySQL Setup Guide

## Current Status
✓ MySQL Server is running  
✓ Database connection is possible  
✗ MySQL password needs to be configured

## Steps to Complete MySQL Setup

### Option 1: If you know your MySQL password
1. Edit `backend/.env` file
2. Set your MySQL password:
   ```
   DB_PASSWORD=your_actual_password
   ```
3. Save the file
4. Run the test again: `cd backend && node test-db-connection.js`

### Option 2: If you don't know your MySQL password
You need to set a password for the MySQL root user. Here's how:

#### For Windows with MySQL installed:
1. Open Command Prompt as Administrator
2. Navigate to MySQL bin directory (usually: `C:\Program Files\MySQL\MySQL Server X.X\bin`)
3. Run: `mysql -u root -p`
4. When prompted for password, try pressing Enter (sometimes no password is set)
5. If that works, set a password:
   ```sql
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_new_password';
   FLUSH PRIVILEGES;
   EXIT;
   ```
6. Update `backend/.env` with your new password

#### For XAMPP/WAMP users:
1. Open phpMyAdmin (usually http://localhost/phpmyadmin)
2. Go to User accounts
3. Find root user and click Edit privileges
4. Change password
5. Update `backend/.env` with your new password

### Option 3: Create a new MySQL user (Recommended for development)
1. Connect to MySQL with root:
   ```bash
   mysql -u root -p
   ```
2. Create a new user:
   ```sql
   CREATE USER 'securefile'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON secure_file_sharing.* TO 'securefile'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```
3. Update `backend/.env`:
   ```
   DB_USER=securefile
   DB_PASSWORD=your_password
   ```

## After Setting Password
1. Update `backend/.env` with your MySQL credentials
2. Run the database schema:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
3. Test the connection:
   ```bash
   cd backend
   node test-db-connection.js
   ```

## Common Issues
- **"Access denied"**: Wrong password or user
- **"ECONNREFUSED"**: MySQL server not running
- **"ER_BAD_DB_ERROR"**: Database doesn't exist (run schema.sql)
