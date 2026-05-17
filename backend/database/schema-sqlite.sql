-- SQLite3 Schema for Attendance Management System

-- User Registration Requests (Admin approval required)
CREATE TABLE IF NOT EXISTS user_registration_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    proposed_role VARCHAR(50) NOT NULL CHECK (proposed_role IN ('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER', 'STUDENT')),
    department VARCHAR(100),
    verification_token VARCHAR(255) UNIQUE,
    verification_token_expires TIMESTAMP,
    is_email_verified BOOLEAN DEFAULT 0,
    request_status VARCHAR(50) DEFAULT 'PENDING' CHECK (request_status IN ('PENDING', 'EMAIL_VERIFIED', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Students, Lecturers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER', 'STUDENT')),
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    lecturer_id INTEGER REFERENCES users(id),
    credits INTEGER,
    semester VARCHAR(20),
    academic_year VARCHAR(20),
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Geofence Zones (Support multiple campuses)
CREATE TABLE IF NOT EXISTS geofence_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 200,
    building_name VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Class Sessions
CREATE TABLE IF NOT EXISTS class_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(50) UNIQUE NOT NULL,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    lecturer_id INTEGER REFERENCES users(id),
    class_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_location VARCHAR(100),
    geofence_zone_id INTEGER REFERENCES geofence_zones(id),
    session_status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (session_status IN ('SCHEDULED', 'ACTIVE', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- QR Codes (Time-bound, single-use tokens)
CREATE TABLE IF NOT EXISTS qr_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    qr_token VARCHAR(500) UNIQUE NOT NULL,
    session_id VARCHAR(50) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    generated_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(50) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    scan_time TIMESTAMP NOT NULL,
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    is_within_geofence BOOLEAN NOT NULL,
    attendance_status VARCHAR(20) NOT NULL CHECK (attendance_status IN ('PRESENT', 'LATE', 'ABSENT')),
    device_fingerprint VARCHAR(255),
    device_info TEXT,
    qr_token_used VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scan Attempts Log (Audit trail)
CREATE TABLE IF NOT EXISTS scan_attempts_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES users(id),
    session_id VARCHAR(50) REFERENCES class_sessions(session_id),
    attempt_time TIMESTAMP NOT NULL,
    scan_status VARCHAR(50) CHECK (scan_status IN ('SUCCESS', 'DUPLICATE', 'EXPIRED_QR', 'OUTSIDE_GEOFENCE', 'INVALID_TOKEN', 'RATE_LIMITED')),
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    error_message TEXT,
    device_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manual Attendance Overrides (For edge cases)
CREATE TABLE IF NOT EXISTS attendance_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendance_record_id INTEGER REFERENCES attendance_records(id),
    student_id INTEGER REFERENCES users(id),
    session_id VARCHAR(50) REFERENCES class_sessions(session_id),
    overridden_by INTEGER REFERENCES users(id),
    override_status VARCHAR(20) CHECK (override_status IN ('PRESENT', 'LATE', 'ABSENT')),
    justification TEXT NOT NULL,
    override_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Reports Cache
CREATE TABLE IF NOT EXISTS attendance_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type VARCHAR(50),
    student_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    date_from DATE,
    date_to DATE,
    total_sessions INTEGER,
    present_count INTEGER,
    late_count INTEGER,
    absent_count INTEGER,
    attendance_percentage DECIMAL(5, 2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_registration_email ON user_registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_user_registration_status ON user_registration_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_user_registration_token ON user_registration_requests(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student_id ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course_id ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_id ON class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_session_id ON class_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_session_id ON qr_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_expires_at ON qr_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_created_at ON attendance_records(created_at);
CREATE INDEX IF NOT EXISTS idx_scan_attempts_student_id ON scan_attempts_log(student_id);
CREATE INDEX IF NOT EXISTS idx_scan_attempts_session_id ON scan_attempts_log(session_id);
