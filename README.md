# QR Code-Based Attendance Management System

## Project Overview

A comprehensive full-stack web and mobile-compatible attendance management system for universities with GPS location verification, dynamic QR code generation, and geofencing capabilities.

## Features

### Core Features
- ✅ Dynamic, time-expiring QR code generation for class sessions
- ✅ Automatic QR code refresh to prevent fraud
- ✅ GPS-based location verification with geofencing
- ✅ Role-based access control (Student, Lecturer, Admin)
- ✅ Attendance marking with timestamp and location tracking
- ✅ Automated audit logging for all scan attempts
- ✅ Device fingerprinting for fraud prevention
- ✅ Rate limiting and security enforcement
- ✅ Real-time admin dashboards
- ✅ Attendance reporting and analytics (CSV/PDF/Excel export)
- ✅ Manual attendance override for edge cases
- ✅ Multi-campus/building support

### Security Features
- JWT-based authentication with 24-hour expiry
- Server-side GPS validation (Haversine formula)
- Rate limiting on scan attempts (3 per 5 minutes per student)
- Device fingerprinting to prevent proxy scanning
- Encrypted QR tokens
- HTTPS enforcement
- Database indexes for performance
- SQL injection prevention (parameterized queries)
- CORS protection

## Technology Stack

### Backend
- **Runtime**: Node.js v16+
- **Framework**: Express.js
- **Database**: PostgreSQL 12+
- **QR Generation**: qrcode
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Geolocation**: Haversine algorithm
- **Rate Limiting**: express-rate-limit
- **Security**: helmet, cors

### Frontend
- **Framework**: React.js 18+
- **Routing**: React Router v6+
- **QR Scanner**: html5-qrcode
- **Charts**: Recharts
- **API Client**: axios
- **Styling**: CSS-in-JS (inline styles)

### Deployment Options
- AWS EC2 / RDS
- Google Cloud Platform (GCP)
- Azure App Service
- Docker containers
- On-premise university servers

## Project Structure

```
project/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Main server file
│   │   ├── config/
│   │   │   └── database.js           # Database connection pool
│   │   ├── routes/
│   │   │   └── index.js              # All API routes
│   │   ├── controllers/
│   │   │   ├── authController.js      # Auth & user management
│   │   │   ├── sessionController.js   # Class session management
│   │   │   ├── attendanceController.js # QR scan & attendance
│   │   │   └── adminController.js     # Admin operations
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT authentication
│   │   │   ├── rateLimiter.js        # Rate limiting
│   │   │   └── errorHandler.js       # Error handling
│   │   └── utils/
│   │       ├── qrCode.js             # QR code generation
│   │       ├── geofencing.js         # GPS validation
│   │       └── deviceFingerprint.js  # Device identification
│   ├── database/
│   │   └── schema.sql                # Database schema
│   ├── .env.example                  # Environment variables template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── index.jsx                 # React entry point
│   │   ├── App.jsx                   # Main router
│   │   ├── components/
│   │   │   ├── Login.jsx             # Login page
│   │   │   ├── StudentScanner.jsx    # Student QR scan
│   │   │   ├── LecturerDashboard.jsx # Lecturer interface
│   │   │   └── AdminDashboard.jsx    # Admin panel
│   │   └── utils/
│   │       ├── api.js                # Axios instance
│   │       ├── apiService.js         # API methods
│   │       ├── locationUtils.js      # GPS utilities
│   │       └── deviceUtils.js        # Device fingerprinting
│   ├── public/
│   │   └── index.html                # HTML template
│   └── package.json
└── docs/
    ├── API_DOCUMENTATION.md
    ├── DEPLOYMENT_GUIDE.md
    ├── SETUP_INSTRUCTIONS.md
    └── GEOFENCE_CONFIGURATION.md
```

## Installation & Setup

### Prerequisites
- Node.js v16+ and npm
- PostgreSQL 12+
- Git
- Modern web browser with GPS support

### Backend Setup

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Create .env file from example
cp .env.example .env

# 3. Configure database
# Edit .env with your PostgreSQL credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=attendance_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key

# 4. Create database
createdb attendance_db

# 5. Run migrations
psql -U postgres -d attendance_db -f database/schema.sql

# 6. Start server
npm run dev
# Server runs on http://localhost:5000
```

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# 3. Start development server
npm start
# App runs on http://localhost:3000
```

## API Documentation

See [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) for complete REST API reference.

### Key Endpoints

**Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile

**Sessions**
- `POST /api/session/create` - Create class session (Lecturer)
- `POST /api/session/start` - Start session & generate QR (Lecturer)
- `POST /api/session/refresh-qr` - Refresh QR code (Lecturer)
- `POST /api/session/close` - End session (Lecturer)

**Attendance**
- `POST /api/attendance/scan` - Scan QR & mark attendance (Student)
- `GET /api/attendance/session/:sessionId` - Get session attendance
- `GET /api/attendance/student/:studentId/history` - Student attendance history

**Admin**
- `GET /api/admin/users` - List all users
- `POST /api/admin/geofence/create` - Create geofence zone
- `GET /api/admin/geofence/zones` - List all zones
- `GET /api/admin/report/attendance` - Generate attendance report
- `POST /api/admin/attendance/override` - Override attendance

## Database Schema

### Key Tables
- **users** - User accounts (Students, Lecturers, Admins)
- **courses** - Course information
- **course_enrollments** - Student enrollments
- **class_sessions** - Individual class sessions
- **qr_codes** - Generated QR tokens
- **attendance_records** - Attendance marks
- **scan_attempts_log** - Audit trail
- **geofence_zones** - Campus boundaries
- **attendance_overrides** - Manual overrides with justification

See [database/schema.sql](backend/database/schema.sql) for complete schema.

## Geofence Configuration

### Default Configuration
```
Campus Center: 40.2065°N, 111.8910°W (Example: BYU Campus)
Radius: 200 meters
```

### How to Configure
1. Go to Admin Dashboard → Geofence Zones
2. Click "Create New Geofence Zone"
3. Enter campus center coordinates (latitude, longitude)
4. Set radius in meters (200-500m recommended)
5. Name the zone (e.g., "Main Campus", "North Building")
6. Save

### For Multiple Campuses
Create separate geofence zones for each campus/building and assign to class sessions.

## Security Considerations

### Implemented Security Measures
1. **GPS Validation** - Server-side verification using Haversine formula
2. **Rate Limiting**
   - General API: 100 requests per 15 minutes
   - Login: 5 attempts per 15 minutes
   - Scan: 3 per 5 minutes per student
   - Attendance: 2 per 1 minute

3. **Device Fingerprinting** - Prevents one student scanning for another
4. **QR Token Encryption** - AES-256 encryption
5. **Duplicate Prevention** - One attendance per student per session
6. **Audit Logging** - All scan attempts logged with metadata
7. **JWT Expiry** - 24-hour token expiration
8. **HTTPS Enforcement** - TLS encryption for all API calls
9. **SQL Injection Protection** - Parameterized queries
10. **Device Info Tracking** - User agent, platform, timezone, language

### Best Practices
- Change `JWT_SECRET` in production
- Use HTTPS in production
- Keep PostgreSQL updated
- Monitor audit logs regularly
- Review geofence accuracy monthly
- Backup database daily
- Implement API authentication on all endpoints

## Running the System

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# Runs on http://localhost:3000
```

### Production Deployment

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

## User Roles & Permissions

### Student
- ✅ Login to system
- ✅ Scan QR codes
- ✅ View own attendance history
- ✅ Cannot access admin/lecturer features

### Lecturer
- ✅ Create and manage class sessions
- ✅ Generate and refresh QR codes
- ✅ View attendance for own classes
- ✅ View attendance reports
- ✅ Cannot access admin features

### Department Admin
- ✅ All lecturer permissions
- ✅ Manage geofence zones
- ✅ Create courses
- ✅ View all users in department
- ✅ Override attendance (with justification)
- ✅ Generate reports
- ✅ Cannot manage other admins

### Super Admin
- ✅ Full system access
- ✅ Manage all users and accounts
- ✅ Configure geofence zones
- ✅ Access all reports
- ✅ System-wide settings

## Troubleshooting

### Common Issues

**GPS Not Working**
- Check browser GPS permissions
- Ensure HTTPS in production
- Check device location services enabled
- Test accuracy with increased timeout (10s)

**QR Code Not Scanning**
- Ensure good lighting
- Camera should be perpendicular to code
- Try different camera angles
- Check browser permissions for camera

**Attendance Not Marking**
- Verify student is logged in
- Check geofence zone coordinates
- Verify session is active
- Check rate limiting not exceeded (3/5min)

**Database Connection Issues**
- Verify PostgreSQL is running
- Check database credentials in .env
- Ensure database exists and schema initialized
- Check firewall rules for DB port (5432)

## Testing

### Sample Test Data

```sql
-- Create test user (Student)
INSERT INTO users (user_id, email, password_hash, full_name, role)
VALUES ('STU001', 'student@university.edu', '$2a$10$...', 'John Doe', 'STUDENT');

-- Create test course
INSERT INTO courses (course_code, course_name, department, lecturer_id, credits)
VALUES ('CS101', 'Intro to CS', 'Computer Science', 1, 3);

-- Create test geofence
INSERT INTO geofence_zones (zone_name, latitude, longitude, radius_meters)
VALUES ('Main Campus', 40.2065, -111.8910, 200);
```

See [SETUP_INSTRUCTIONS.md](docs/SETUP_INSTRUCTIONS.md) for detailed testing guide.

## Contributing

1. Create feature branch (`git checkout -b feature/amazing-feature`)
2. Commit changes (`git commit -m 'Add amazing feature'`)
3. Push to branch (`git push origin feature/amazing-feature`)
4. Open Pull Request

## Performance Optimization

- Database indexes on frequently queried fields
- JWT token caching on frontend
- Geofence zone caching (refresh hourly)
- QR code image caching (refresh every 30s)
- API response pagination (default 50, max 100)
- Connection pooling for database
- Gzip compression on backend responses

## Monitoring & Logs

### Log Locations
- Backend: stdout
- Database: PostgreSQL logs
- Frontend: Browser console

### Key Metrics to Monitor
- API response time (target <100ms)
- GPS accuracy (target <50m)
- QR scan success rate (target >95%)
- Database query time (target <50ms)
- System uptime (target >99.9%)

## Support & Contact

For issues, questions, or feature requests:
1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Review API documentation
3. Check database logs
4. Contact: admin@university.edu

## License

This project is proprietary to the University. All rights reserved.

## Changelog

### v1.0.0 (Initial Release)
- QR code generation and expiry
- GPS geofencing with validation
- Role-based access control
- Attendance marking and reporting
- Admin dashboard
- Lecturer dashboard
- Student scanner
- Device fingerprinting
- Rate limiting and security

See [CHANGELOG.md](docs/CHANGELOG.md) for detailed changes.
