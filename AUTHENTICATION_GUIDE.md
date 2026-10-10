# Authentication System Guide

## Overview
The Secure File Sharing System implements a complete authentication system with JWT tokens, bcrypt password hashing, and role-based access control.

## Features Implemented

### Backend Authentication (PHASE 3 & 6)
✓ User registration with email validation
✓ User login with credential verification
✓ JWT token generation and validation
✓ bcrypt password hashing
✓ User profile retrieval
✓ Account status checking (ACTIVE/INACTIVE/SUSPENDED)
✓ Role-based authorization (USER/ADMIN)
✓ Protected routes with middleware
✓ Automatic token expiration (24 hours)

### Frontend Authentication (PHASE 2 & 6)
✓ Registration form with validation
✓ Login form with error handling
✓ Authentication context for state management
✓ Protected route components
✓ Admin route components
✓ Automatic token inclusion in API requests
✓ Automatic logout on token expiration
✓ Loading spinner components
✓ Persistent authentication via localStorage

## How It Works

### Registration Flow
1. User fills registration form (name, email, password)
2. Frontend validates form (password matching, minimum length)
3. Frontend sends POST request to `/api/auth/register`
4. Backend checks if email already exists
5. Backend hashes password with bcrypt
6. Backend creates user record in database
7. Backend generates JWT token
8. Backend returns token and user data
9. Frontend stores token in localStorage
10. Frontend updates user state
11. User is redirected to dashboard

### Login Flow
1. User fills login form (email, password)
2. Frontend sends POST request to `/api/auth/login`
3. Backend finds user by email
4. Backend checks account status
5. Backend compares password with bcrypt hash
6. Backend generates JWT token
7. Backend returns token and user data
8. Frontend stores token in localStorage
9. Frontend updates user state
10. User is redirected to dashboard

### Protected Route Flow
1. User attempts to access protected route
2. ProtectedRoute component checks authentication state
3. If loading, shows LoadingSpinner
4. If not authenticated, redirects to login
5. If authenticated, renders the protected component

### API Request Flow
1. Component makes API call using axios instance
2. Request interceptor adds JWT token to Authorization header
3. Backend middleware validates token
4. If valid, request proceeds to controller
5. If invalid/expired, returns 401
6. Response interceptor handles 401 by clearing token and redirecting

## Security Features

### Password Security
- Passwords are never stored in plain text
- bcrypt hashing with salt rounds = 10
- Minimum password length = 6 characters
- Password confirmation required during registration

### Token Security
- JWT tokens expire after 24 hours
- Tokens are stored in localStorage (for development)
- Tokens are sent in Authorization header
- Automatic token validation on each request
- Automatic logout on token expiration

### Account Security
- Email addresses must be unique
- Account status prevents inactive users from logging in
- Role-based access control for admin functions
- Input validation on all endpoints

## API Endpoints

### POST /api/auth/register
**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

**Error Responses:**
- 400: Email already registered
- 400: Validation errors
- 500: Server error

### POST /api/auth/login
**Request:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE"
  }
}
```

**Error Responses:**
- 401: Invalid credentials
- 403: Account not active
- 500: Server error

### GET /api/auth/me
**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- 401: Invalid or expired token
- 404: User not found
- 500: Server error

## Testing Authentication

### Test Registration
1. Navigate to `/register`
2. Fill in name, email, and password
3. Submit form
4. Should redirect to `/dashboard`
5. Check localStorage for token
6. Check navbar shows user name

### Test Login
1. Navigate to `/login`
2. Fill in email and password
3. Submit form
4. Should redirect to `/dashboard`
5. Check localStorage for token
6. Check navbar shows user name

### Test Protected Routes
1. Try to access `/dashboard` without login
2. Should redirect to `/login`
3. Login and try again
4. Should access dashboard successfully

### Test Admin Routes
1. Login as regular user
2. Try to access `/admin`
3. Should redirect to `/dashboard`
4. Login as admin user
5. Try to access `/admin`
6. Should access admin dashboard successfully

### Test Token Expiration
1. Login successfully
2. Wait 24 hours (or manually expire token)
3. Try to access protected route
4. Should redirect to `/login`
5. Token should be cleared from localStorage

## Default Admin Account
- Email: `admin@securefile.com`
- Password: `admin123`
- Role: `ADMIN`
- Status: `ACTIVE`

**IMPORTANT:** Change this password immediately after first login!

## Troubleshooting

### Registration Issues
- **Email already registered**: Try a different email or check if account exists
- **Password too short**: Use at least 6 characters
- **Validation errors**: Check form fields are properly filled

### Login Issues
- **Invalid credentials**: Check email and password are correct
- **Account not active**: Contact admin to activate account
- **Server error**: Check backend is running and database is connected

### Token Issues
- **Token expired**: Login again to get new token
- **Invalid token**: Clear localStorage and login again
- **401 errors**: Check token is stored and being sent correctly

### Database Issues
- **Connection failed**: Check MySQL is running and credentials are correct
- **User not found**: Check database has user records
- **Schema errors**: Run database schema creation script

## Next Steps
The authentication system is fully functional and ready for integration with:
- File upload functionality
- File sharing features
- Activity logging
- Admin dashboard
