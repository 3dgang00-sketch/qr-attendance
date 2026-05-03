# Quick Start Guide - After Improvements

This guide helps you get started with the improved Attendance Management System.

## 🚀 Quick Start (5 minutes)

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### 2. Configure Environment

```bash
# Copy the example env file
cd backend
cp .env.example .env

# Edit .env with your database credentials
nano .env  # or your preferred editor
```

**Required environment variables:**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database config
- `JWT_SECRET` - Use a strong, random string (min 32 characters)
- `NODE_ENV` - Set to 'development' for local work
- `PORT` - Server port (default: 5000)
- `ALLOWED_ORIGINS` - Frontend URLs (default: http://localhost:3000)

### 3. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm start

# Terminal 3: Database setup (if needed)
cd backend
npm run migrate
```

## 📁 Project Structure Overview

```
backend/
├── src/
│   ├── server.js              # Main server with improved setup
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   │   ├── asyncHandler.js    # NEW: Wrap async routes
│   │   ├── errorHandler.js    # IMPROVED: Better error handling
│   │   ├── validation.js      # NEW: Input validation
│   │   ├── logger.js          # NEW: Request logging
│   │   └── responseFormatter.js # NEW: Standardized responses
│   └── utils/
│       ├── AppError.js        # NEW: Custom error classes
│       ├── envValidator.js    # NEW: Environment validation
│       └── ...
├── .env.example               # IMPROVED: Better documentation
├── package.json               # UPDATED: New dependencies
└── logs/                      # NEW: Created automatically

frontend/
├── src/
│   ├── App.jsx                # IMPROVED: Uses contexts
│   ├── context/
│   │   ├── AuthContext.jsx    # NEW: Authentication state
│   │   └── AppContext.jsx     # NEW: Global app state
│   ├── components/
│   │   ├── ErrorBoundary.jsx  # NEW: Error handling
│   │   ├── NotificationContainer.jsx # NEW: Toast notifications
│   │   └── ...
│   └── ...
└── ...
```

## 🔧 New Features & Improvements

### Backend

#### 1. Input Validation
All API endpoints now validate inputs with detailed error messages:

```javascript
// Example error response
{
  "error": {
    "message": "Input validation failed",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "timestamp": "2026-05-01T...",
    "details": {
      "email": ["Must be a valid email address"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

#### 2. Standardized Responses
All successful responses follow this format:

```javascript
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "student123",
    "email": "student@university.edu"
  },
  "timestamp": "2026-05-01T..."
}
```

#### 3. Better Error Handling
Consistent error responses with proper HTTP status codes:

- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate entry
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server errors

#### 4. Request Logging
- Automatic HTTP request logging in development (console)
- Production logging to `backend/logs/access.log`
- Tracks method, path, status, and response time

#### 5. Environment Validation
Server validates all required environment variables on startup:

```bash
# If .env is missing required variables:
❌ Environment Configuration Error: Missing required environment variables: DB_HOST, DB_PORT...
```

#### 6. Graceful Shutdown
Server handles SIGTERM and SIGINT for clean shutdown:

```bash
SIGTERM received. Starting graceful shutdown...
Server closed
```

### Frontend

#### 1. Authentication Context
Replace scattered localStorage code with `useAuth()` hook:

```javascript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, login, logout, isAdmin } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user?.fullName}</p>
      {isAdmin() && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

#### 2. Global Notifications
Show toast notifications with `useApp()` hook:

```javascript
import { useApp } from './context/AppContext';

function LoginForm() {
  const { showSuccess, showError } = useApp();
  
  const handleLogin = async () => {
    try {
      await loginUser();
      showSuccess('Login successful!');
    } catch (error) {
      showError('Login failed: ' + error.message);
    }
  };
}
```

#### 3. Error Boundary
Automatically catch and display component errors:

```javascript
// Wraps entire app - shows friendly error UI if any component crashes
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

## 📝 Examples

### Adding a New API Endpoint

```javascript
const { registerValidation, handleValidationErrors } = require('./middleware/validation');
const asyncHandler = require('./middleware/asyncHandler');
const { AppError } = require('./utils/AppError');

router.post('/users',
  registerValidation,        // Validate input
  handleValidationErrors,    // Check for errors
  asyncHandler(async (req, res, next) => {
    // Async errors are automatically caught and passed to error handler
    const user = await User.create(req.body);
    
    // Use standardized response
    res.created(user, 'User created successfully');
  })
);

// Error handling is automatic:
// - Validation errors return 400
// - Async errors are caught and handled
// - Custom AppErrors are formatted properly
```

### Using Authentication in a Component

```javascript
import { useAuth } from './context/AuthContext';

function AdminPanel() {
  const { user, isAdmin, hasRole } = useAuth();
  
  if (!isAdmin()) {
    return <div>Access Denied</div>;
  }
  
  if (hasRole(['SUPER_ADMIN'])) {
    return <SuperAdminPanel />;
  }
  
  return <DeptAdminPanel />;
}
```

### Creating Custom Error Messages

```javascript
const { ValidationError, NotFoundError, ConflictError } = require('./utils/AppError');

// In a route handler:
const user = await User.findById(userId);
if (!user) {
  throw new NotFoundError(`User ${userId} not found`);
}

// Duplicate check
if (await User.findByEmail(email)) {
  throw new ConflictError('Email already registered');
}

// Custom validation
if (password.length < 8) {
  throw new ValidationError('Password too short', {
    password: ['Must be at least 8 characters']
  });
}
```

## 🧪 Testing the Improvements

### Test Input Validation
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "short"}'

# Response includes detailed validation errors
```

### Test Error Handling
```bash
curl http://localhost:5000/api/users/nonexistent

# Returns 404 with formatted error
```

### Check Health Status
```bash
curl http://localhost:5000/health

# Returns: {"status":"OK","timestamp":"...","environment":"development","uptime":12.5}
```

### Monitor Logs
```bash
# Backend logs in development (console output)
# Production logs in: backend/logs/access.log

tail -f backend/logs/access.log
```

## 🔐 Security Best Practices

1. **JWT Secret**: Use a strong, random string (min 32 characters)
   ```bash
   # Generate a strong secret:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Environment Variables**: Never commit `.env` file
   - Use `.env.example` as template
   - `.env` is in `.gitignore`

3. **Database**: Always use encrypted connections in production
   - Enable SSL/TLS for PostgreSQL
   - Use strong database passwords

4. **CORS**: Configure allowed origins carefully
   ```
   ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
   ```

## 📊 Performance Improvements

- **Compression**: All responses are gzip-compressed
- **Validation**: Input validation prevents processing invalid data
- **Logging**: Structured logging for debugging
- **Error Handling**: Prevents server crashes from unhandled errors

## 🐛 Troubleshooting

### "Missing required environment variables"
- Check your `.env` file exists
- Verify all required variables are set
- Restart the server after changing `.env`

### "Invalid JWT_SECRET"
- JWT_SECRET must be at least 32 characters long
- Regenerate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Database connection errors
- Verify database is running
- Check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` in `.env`
- Ensure database user has necessary permissions

### CORS errors on frontend
- Check `ALLOWED_ORIGINS` includes your frontend URL
- Format: `http://localhost:3000,https://yourdomain.com`
- Restart backend after changing CORS settings

## 📚 Additional Resources

- [IMPROVEMENTS.md](./IMPROVEMENTS.md) - Detailed list of all improvements
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - API endpoints
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) - Deployment instructions

## ✅ Next Steps

1. Install dependencies (`npm install` in both folders)
2. Configure `.env` file with database credentials
3. Start development servers (`npm run dev` in backend, `npm start` in frontend)
4. Test authentication flow
5. Review [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed changes

Happy coding! 🎉
