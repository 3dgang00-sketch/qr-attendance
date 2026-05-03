# Setup Instructions

## Initial System Setup Guide

This guide walks through the complete setup process for the Attendance Management System.

## Quick Start (5 minutes)

### Prerequisites Check
```bash
# Node.js version
node --version  # Should be v16 or higher

# npm version
npm --version   # Should be v8 or higher

# PostgreSQL
psql --version  # Should be v12 or higher
```

### Minimal Setup
```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev

# 2. Frontend (new terminal)
cd frontend
npm install
npm start

# System ready at http://localhost:3000
```

---

## Full Production Setup (30 minutes)

### Phase 1: Database Setup (5 minutes)

**1.1 Create PostgreSQL Database**
```bash
# Login to PostgreSQL
sudo -u postgres psql

# Inside psql:
CREATE DATABASE attendance_db;
CREATE USER attendance_user WITH PASSWORD 'secure_password';
ALTER ROLE attendance_user SET client_encoding TO 'utf8';
ALTER ROLE attendance_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE attendance_user SET default_transaction_deferrable TO on;
ALTER ROLE attendance_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE attendance_db TO attendance_user;
\q
```

**1.2 Load Schema**
```bash
psql -U attendance_user -d attendance_db -f backend/database/schema.sql
```

**1.3 Verify Setup**
```bash
# Test connection
psql -U attendance_user -d attendance_db -c "SELECT COUNT(*) FROM users;"
# Should return: count = 0
```

### Phase 2: Backend Configuration (10 minutes)

**2.1 Environment Setup**
```bash
cd backend
cp .env.example .env
```

**2.2 Configure .env**
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=attendance_user
DB_PASSWORD=secure_password

# Server
PORT=5000
NODE_ENV=production
JWT_SECRET=generate_with_openssl_rand_hex_16

# Geofencing (find campus coordinates at https://maps.google.com)
CAMPUS_LATITUDE=40.2065
CAMPUS_LONGITUDE=-111.8910
GEOFENCE_RADIUS_METERS=200

# Security
HTTPS_ENFORCED=true
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomnain.com
```

**Generate JWT Secret:**
```bash
openssl rand -hex 32
# Copy output to .env JWT_SECRET
```

**2.3 Install Dependencies**
```bash
npm install
```

**2.4 Start Backend**
```bash
# Development mode
npm run dev

# Production mode with PM2
pm2 start src/server.js --name "attendance-api"
```

**2.5 Verify Backend**
```bash
curl http://localhost:5000/health
# Should return: {"status":"OK","timestamp":"..."}
```

### Phase 3: Frontend Configuration (10 minutes)

**3.1 Environment Setup**
```bash
cd frontend
cp .env.example .env
```

**3.2 Configure .env**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_QR_REFRESH=30
REACT_APP_GPS_TIMEOUT=10000
```

**3.3 Install Dependencies**
```bash
npm install
```

**3.4 Start Frontend**
```bash
npm start
# Opens http://localhost:3000
```

**3.5 Verify Frontend**
- Open http://localhost:3000
- See login page
- Check browser console for errors

### Phase 4: Create Initial Data (5 minutes)

**4.1 Create Admin User**
```bash
# Generate password hash
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

**4.2 Insert Admin into Database**
```bash
psql -U attendance_user -d attendance_db << EOF
INSERT INTO users (user_id, email, password_hash, full_name, role, is_active)
VALUES ('ADMIN001', 'admin@university.edu', '$2a$10$...copied_hash...', 'System Admin', 'SUPER_ADMIN', true);
EOF
```

**4.3 Create Test Geofence Zone**
```bash
psql -U attendance_user -d attendance_db << EOF
INSERT INTO geofence_zones (zone_name, latitude, longitude, radius_meters, is_active)
VALUES ('Main Campus', 40.2065, -111.8910, 200, true);
EOF
```

**4.4 Create Test Course**
```bash
psql -U attendance_user -d attendance_db << EOF
INSERT INTO courses (course_code, course_name, department, credits, is_active)
VALUES ('CS101', 'Introduction to Computer Science', 'Computer Science', 3, true);
EOF
```

**4.5 Create Test User (Student)**
```bash
psql -U attendance_user -d attendance_db << EOF
INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active)
VALUES ('STU001', 'student@university.edu', '$2a$10$...copied_hash...', 'John Doe', 'STUDENT', 'Computer Science', true);
EOF
```

**4.6 Create Test User (Lecturer)**
```bash
psql -U attendance_user -d attendance_db << EOF
INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active)
VALUES ('LEC001', 'lecturer@university.edu', '$2a$10$...copied_hash...', 'Jane Smith', 'LECTURER', 'Computer Science', true);
EOF
```

### Phase 5: Testing (5 minutes)

**5.1 Test Admin Login**
```
1. Go to http://localhost:3000
2. Email: admin@university.edu
3. Password: admin123
4. Should redirect to /admin/dashboard
```

**5.2 Test Lecturer Login**
```
1. Go to http://localhost:3000
2. Email: lecturer@university.edu
3. Password: admin123
4. Should redirect to /lecturer/dashboard
5. Create a class session (CS101, today, 2:00-3:00 PM)
```

**5.3 Test Student Login**
```
1. Go to http://localhost:3000
2. Email: student@university.edu
3. Password: admin123
4. Should redirect to /student/scan page
5. Should see camera scanner ready
```

**5.4 Test QR Scanning Flow**
```
1. As Lecturer: Create and start session
2. Copy QR code to another browser (for testing)
3. As Student: Try to scan QR code
4. Verify success/failure messages
5. Check browser console for GPS requests
```

---

## Development Workflow

### Running in Development Mode

**Terminal 1 - Database:**
```bash
# Start PostgreSQL (if not running as service)
postgres -D /usr/local/var/postgres
```

**Terminal 2 - Backend (with auto-reload):**
```bash
cd backend
npm run dev
# Watches for changes, auto-restarts on save
```

**Terminal 3 - Frontend (with hot reload):**
```bash
cd frontend
npm start
# Browser auto-refreshes on save
```

### Code Organization

**Backend Structure:**
- `src/server.js` - Express app initialization
- `src/routes/` - API route definitions
- `src/controllers/` - Business logic
- `src/middleware/` - Auth, validation, errors
- `src/utils/` - Helper functions (QR, GPS, etc.)

**Frontend Structure:**
- `src/App.jsx` - Main router component
- `src/components/` - React components
- `src/pages/` - Page components
- `src/utils/` - API client, helpers

### File Editing Workflow

**1. Make code change in editor**
```
Edit src/controllers/attendanceController.js
```

**2. Auto-reload triggers**
```
Development server detects change
Backend: Server restarts
Frontend: Page hot-reloads
```

**3. Test in browser**
```
Access http://localhost:3000
Feature works? Commit!
```

---

## Configuration Reference

### Environment Variables

**Backend (.env)**

| Variable | Example | Required | Purpose |
|----------|---------|----------|---------|
| `DB_HOST` | localhost | Yes | Database server |
| `DB_PORT` | 5432 | Yes | Database port |
| `DB_NAME` | attendance_db | Yes | Database name |
| `DB_USER` | postgres | Yes | DB username |
| `DB_PASSWORD` | password | Yes | DB password |
| `PORT` | 5000 | No | Server port |
| `NODE_ENV` | production | No | Environment |
| `JWT_SECRET` | xxxxx | Yes | Token signing key |
| `QR_CODE_EXPIRY_MINUTES` | 5 | No | QR validity |
| `CAMPUS_LATITUDE` | 40.2065 | Yes | Geofence center lat |
| `CAMPUS_LONGITUDE` | -111.8910 | Yes | Geofence center lon |
| `GEOFENCE_RADIUS_METERS` | 200 | Yes | Geofence radius |
| `HTTPS_ENFORCED` | true | No | Require HTTPS |

**Frontend (.env)**

| Variable | Example | Required |
|----------|---------|----------|
| `REACT_APP_API_URL` | http://localhost:5000/api | Yes |
| `REACT_APP_QR_REFRESH` | 30 | No |

---

## Database Verification

### Check Installation
```bash
# Connect to database
psql -U attendance_user -d attendance_db

# Inside psql:
# View all tables
\dt

# Check users table
SELECT COUNT(*) FROM users;

# View specific user
SELECT * FROM users WHERE user_id = 'STU001';

# Check geofence zones
SELECT * FROM geofence_zones;

# Exit
\q
```

---

## Debugging

### Enable Debug Logging

**Backend Debug:**
```bash
# Run with debug enabled
DEBUG=attendance:* npm run dev
```

**Frontend Console:**
```javascript
// In browser console
localStorage.debug = 'attendance:*'
```

### Check Logs

**Backend Logs:**
```bash
# View latest logs
tail -f logs/app.log

# Search for errors
grep "ERROR" logs/app.log

# With PM2
pm2 logs attendance-api --lines 100
```

### Database Debugging

```bash
# Enable query logging
psql -U attendance_user -d attendance_db
SET log_statement TO 'all';

# View slow queries
SELECT * FROM log WHERE duration > 100;
```

---

## Troubleshooting Setup

### Problem: "Connection refused" for database
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Verify connection
psql -U attendance_user -d attendance_db -c "SELECT 1;"
```

### Problem: "Port 5000 already in use"
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Problem: "QR code not displaying"
```bash
# Check QR generation
curl -X POST http://localhost:5000/api/session/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "..."}'

# Check response for qrImage field
```

### Problem: "GPS not working"
```bash
# Check browser permissions
1. Go to Chrome Settings
2. Privacy > Site Settings > Location
3. Ensure http://localhost:3000 is allowed

# Test GPS directly
navigator.geolocation.getCurrentPosition(
  pos => console.log(pos.coords)
);
```

---

## Performance Optimization

### Backend Optimization
```bash
# Enable connection pooling
DB_POOL_SIZE=20

# Increase cache
NODE_OPTIONS="--max_old_space_size=512"

# Enable compression
compression=true
```

### Frontend Optimization
```bash
# Build optimized production version
npm run build

# Analyze bundle size
npm run analyze
```

### Database Optimization
```bash
# Run ANALYZE
psql -U attendance_user -d attendance_db -c "ANALYZE;"

# Run VACUUM
psql -U attendance_user -d attendance_db -c "VACUUM;"

# Check index usage
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename NOT LIKE 'pg_%';
```

---

## Production Checklist

Before going live:

- [ ] Environment variables configured
- [ ] Database secured and backed up
- [ ] SSL certificate installed
- [ ] Firewall rules configured
- [ ] Admin user created
- [ ] Geofence zones configured
- [ ] Logging enabled
- [ ] Monitoring setup
- [ ] Disaster recovery plan created
- [ ] Staff trained
- [ ] Test users created
- [ ] Rate limiting verified
- [ ] CORS properly configured
- [ ] API documentation published
- [ ] Backup strategy confirmed

---

## Getting Help

### Resources
- API Docs: `docs/API_DOCUMENTATION.md`
- Deployment: `docs/DEPLOYMENT_GUIDE.md`
- Geofence: `docs/GEOFENCE_CONFIGURATION.md`

### Support Contacts
- Admin: admin@university.edu
- Tech Support: support@university.edu
- Emergency: +1-555-0123

---

## Next Steps

1. ✅ Complete full setup
2. 📚 Read API documentation
3. 🔐 Configure security settings
4. 📍 Setup geofence zones
5. 👥 Create test users
6. 🧪 Run integration tests
7. 📤 Deploy to production

---

**Setup completed! System ready for use.**
