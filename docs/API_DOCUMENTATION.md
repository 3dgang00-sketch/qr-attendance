# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "userId": "STU001",
  "email": "student@university.edu",
  "password": "secure_password",
  "fullName": "John Doe",
  "role": "STUDENT",
  "department": "Computer Science"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "user_id": "STU001",
    "email": "student@university.edu",
    "full_name": "John Doe",
    "role": "STUDENT"
  }
}
```

**Error Response (409):**
```json
{
  "error": "User ID or email already exists"
}
```

---

### Login
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "student@university.edu",
  "password": "secure_password"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "userId": "STU001",
    "email": "student@university.edu",
    "fullName": "John Doe",
    "role": "STUDENT",
    "department": "Computer Science"
  }
}
```

**Error Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

---

### Get User Profile
**GET** `/auth/profile`

Get currently authenticated user's profile.

**Auth Required:** Yes

**Response (200):**
```json
{
  "id": 1,
  "user_id": "STU001",
  "email": "student@university.edu",
  "full_name": "John Doe",
  "role": "STUDENT",
  "department": "Computer Science",
  "is_active": true,
  "last_login": "2024-01-20T10:30:00Z"
}
```

---

### Update User Profile
**PUT** `/auth/profile`

Update user profile information.

**Auth Required:** Yes

**Request Body:**
```json
{
  "fullName": "John Updated",
  "phone": "+1-555-0123"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "user_id": "STU001",
    "email": "student@university.edu",
    "full_name": "John Updated",
    "role": "STUDENT",
    "department": "Computer Science",
    "phone": "+1-555-0123"
  }
}
```

---

## Session Endpoints

### Create Class Session
**POST** `/session/create`

Create a new class session.

**Auth Required:** Yes (LECTURER, SUPER_ADMIN)

**Request Body:**
```json
{
  "courseId": 1,
  "classDate": "2024-01-20",
  "startTime": "10:00:00",
  "endTime": "11:30:00",
  "roomLocation": "Room 101",
  "geofenceZoneId": 1
}
```

**Response (201):**
```json
{
  "message": "Class session created successfully",
  "session": {
    "id": 5,
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "course_id": 1,
    "lecturer_id": 2,
    "class_date": "2024-01-20",
    "start_time": "10:00:00",
    "end_time": "11:30:00",
    "session_status": "SCHEDULED"
  }
}
```

---

### Start Session & Generate QR Code
**POST** `/session/start`

Start a class session and generate QR code.

**Auth Required:** Yes (LECTURER, SUPER_ADMIN)

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (200):**
```json
{
  "message": "Session started, QR code generated",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "qrToken": "encrypted_qr_token_string",
  "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAA...",
  "expiresAt": "2024-01-20T10:10:00Z",
  "expiryMinutes": 5
}
```

---

### Refresh QR Code
**POST** `/session/refresh-qr`

Generate a new QR code for active session.

**Auth Required:** Yes (LECTURER, SUPER_ADMIN)

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (200):**
```json
{
  "message": "New QR code generated",
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "qrToken": "new_encrypted_qr_token",
  "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAA...",
  "expiresAt": "2024-01-20T10:15:00Z",
  "expiryMinutes": 5
}
```

---

### Close Session
**POST** `/session/close`

End a class session.

**Auth Required:** Yes (LECTURER, SUPER_ADMIN)

**Request Body:**
```json
{
  "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (200):**
```json
{
  "message": "Session closed",
  "session": {
    "id": 5,
    "session_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "session_status": "CLOSED"
  }
}
```

---

## Attendance Endpoints

### Scan QR Code & Mark Attendance
**POST** `/attendance/scan`

Scan QR code and mark attendance with GPS verification.

**Auth Required:** Yes (STUDENT)

**Rate Limit:** 3 scans per 5 minutes per student

**Request Body:**
```json
{
  "qrToken": "encrypted_qr_token_string",
  "gpsLatitude": 40.2065,
  "gpsLongitude": -111.8910,
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "language": "en-US",
    "timezone": "America/Denver",
    "platform": "Windows",
    "vendor": "Google"
  }
}
```

**Response (201):**
```json
{
  "message": "Attendance marked successfully",
  "attendance": {
    "id": 42,
    "status": "PRESENT",
    "scanTime": "2024-01-20T10:05:30Z",
    "location": {
      "latitude": 40.2065,
      "longitude": -111.8910,
      "distance": 45
    }
  }
}
```

**Error Response (403):**
```json
{
  "error": "Location outside campus geofence",
  "distance": 350,
  "allowedRadius": 200
}
```

**Error Response (409):**
```json
{
  "error": "Attendance already marked for this session",
  "attendanceStatus": "PRESENT"
}
```

---

### Get Session Attendance
**GET** `/attendance/session/{sessionId}`

Get all attendance records for a session.

**Auth Required:** Yes (LECTURER, DEPT_ADMIN, SUPER_ADMIN)

**Response (200):**
```json
[
  {
    "id": 42,
    "student_id": 1,
    "user_id": "STU001",
    "full_name": "John Doe",
    "email": "student@university.edu",
    "scan_time": "2024-01-20T10:05:30Z",
    "gps_latitude": 40.2065,
    "gps_longitude": -111.8910,
    "is_within_geofence": true,
    "attendance_status": "PRESENT"
  }
]
```

---

### Get Student Attendance History
**GET** `/attendance/student/{studentId}/history`

Get attendance history for a specific student.

**Auth Required:** Yes

**Query Parameters:**
- `courseId` (optional): Filter by course
- `fromDate` (optional): Start date (YYYY-MM-DD)
- `toDate` (optional): End date (YYYY-MM-DD)
- `limit` (optional, default 50): Records per page
- `offset` (optional, default 0): Pagination offset

**Response (200):**
```json
[
  {
    "id": 42,
    "attendance_status": "PRESENT",
    "scan_time": "2024-01-20T10:05:30Z",
    "course_code": "CS101",
    "course_name": "Intro to Computer Science",
    "class_date": "2024-01-20",
    "start_time": "10:00:00"
  }
]
```

---

## Admin & Reports Endpoints

### Get Attendance Report
**GET** `/admin/report/attendance`

Generate attendance report with statistics.

**Auth Required:** Yes (SUPER_ADMIN, DEPT_ADMIN, LECTURER)

**Query Parameters:**
- `courseId` (optional): Filter by course
- `studentId` (optional): Filter by student
- `fromDate` (optional): Start date
- `toDate` (optional): End date

**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": "STU001",
    "full_name": "John Doe",
    "course_id": 1,
    "course_code": "CS101",
    "course_name": "Intro to Computer Science",
    "total_sessions": 15,
    "present_count": 14,
    "late_count": 1,
    "absent_count": 0,
    "attendance_percentage": 93.33
  }
]
```

---

### Create Geofence Zone
**POST** `/admin/geofence/create`

Create a new geofence zone.

**Auth Required:** Yes (SUPER_ADMIN, DEPT_ADMIN)

**Request Body:**
```json
{
  "zoneName": "Main Campus",
  "latitude": 40.2065,
  "longitude": -111.8910,
  "radiusMeters": 200,
  "buildingName": "Engineering Building",
  "description": "Main campus area including class buildings"
}
```

**Response (201):**
```json
{
  "message": "Geofence zone created",
  "zone": {
    "id": 1,
    "zone_name": "Main Campus",
    "latitude": 40.2065,
    "longitude": -111.8910,
    "radius_meters": 200,
    "building_name": "Engineering Building",
    "is_active": true
  }
}
```

---

### Get All Geofence Zones
**GET** `/admin/geofence/zones`

List all active geofence zones.

**Auth Required:** Yes

**Response (200):**
```json
[
  {
    "id": 1,
    "zone_name": "Main Campus",
    "latitude": 40.2065,
    "longitude": -111.8910,
    "radius_meters": 200,
    "building_name": "Engineering Building",
    "is_active": true
  }
]
```

---

### Update Geofence Zone
**PUT** `/admin/geofence/{zoneId}`

Update geofence zone configuration.

**Auth Required:** Yes (SUPER_ADMIN, DEPT_ADMIN)

**Request Body:**
```json
{
  "latitude": 40.2070,
  "longitude": -111.8915,
  "radiusMeters": 250,
  "description": "Updated campus area"
}
```

**Response (200):**
```json
{
  "message": "Geofence zone updated",
  "zone": {
    "id": 1,
    "zone_name": "Main Campus",
    "latitude": 40.2070,
    "longitude": -111.8915,
    "radius_meters": 250
  }
}
```

---

### Override Attendance
**POST** `/admin/attendance/override`

Manually override attendance record.

**Auth Required:** Yes (SUPER_ADMIN, DEPT_ADMIN)

**Request Body:**
```json
{
  "attendanceRecordId": 42,
  "overrideStatus": "PRESENT",
  "justification": "Student had GPS failure but was verifiably present"
}
```

**Response (201):**
```json
{
  "message": "Attendance overridden",
  "override": {
    "id": 10,
    "attendance_record_id": 42,
    "override_status": "PRESENT",
    "justification": "Student had GPS failure but was verifiably present",
    "override_date": "2024-01-20T14:30:00Z"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields: QR code, GPS coordinates"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions.",
  "requiredRoles": ["LECTURER"],
  "userRole": "STUDENT"
}
```

### 404 Not Found
```json
{
  "error": "Session not found"
}
```

### 409 Conflict
```json
{
  "error": "Attendance already marked for this session"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many scan attempts. Please wait before trying again."
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Login**: 5 attempts per 15 minutes
- **QR Scan**: 3 per 5 minutes per student
- **Attendance**: 2 per 1 minute per student

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704700200
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit` - Records per page (default 50, max 100)
- `offset` - Pagination offset (default 0)

**Example:**
```
GET /admin/report/attendance?limit=25&offset=50
```

---

## Data Types

### DateTime
All timestamps use ISO 8601 format:
- Format: `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2024-01-20T10:05:30Z`

### Coordinates
GPS coordinates use decimal degrees:
- Latitude: -90 to 90
- Longitude: -180 to 180
- Example: `40.2065, -111.8910`

### User Roles
- `STUDENT`
- `LECTURER`
- `DEPT_ADMIN`
- `SUPER_ADMIN`

### Attendance Status
- `PRESENT`
- `LATE`
- `ABSENT`

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "password123"
  }'
```

### Scan QR Code
```bash
curl -X POST http://localhost:5000/api/attendance/scan \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "encrypted_token",
    "gpsLatitude": 40.2065,
    "gpsLongitude": -111.8910,
    "deviceInfo": {
      "userAgent": "Mozilla/5.0",
      "language": "en-US",
      "timezone": "America/Denver"
    }
  }'
```

### Get Attendance Report
```bash
curl -X GET "http://localhost:5000/api/admin/report/attendance?courseId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Webhooks (Future)

Planned webhook events:
- `attendance.marked`
- `session.started`
- `session.closed`
- `qr.expired`
- `geofence.violation`

---

## Version History

- **v1.0.0** (2024-01) - Initial release

---

For support: admin@university.edu
