-- Insert Test Users
-- Run this in pgAdmin Query Tool or psql to add test accounts

-- Admin User
INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active)
VALUES (
  'ADMIN001',
  'admin@university.edu',
  '$2a$10$YSj/7y6GMLVRkcYLWgMpTuzA3Pz9QrGD8qZqZXzgOCBl5YZmYHrGq', -- password: admin123
  'Admin User',
  'SUPER_ADMIN',
  'Administration',
  true
);

-- Lecturer User
INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active)
VALUES (
  'TEMP_LECTURER_001',
  'lecturer@university.edu',
  '$2a$10$5qYxP5KN5p8V8qE8j8j8j8j8j8j8j8j8j8j8j8j8j8j8j8j8j8j8j', -- password: lecturer123
  'Dr. John Lecturer',
  'LECTURER',
  'Computer Science',
  true
);

-- Student User
INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active)
VALUES (
  'TEMP_STUDENT_001',
  'student@university.edu',
  '$2a$10$JDPxY8z9E5q7Z1x8P2w3o4n5m6l7k8j9h0g1f2e3d4c5b6a7z8y9x', -- password: student123
  'Jane Student',
  'STUDENT',
  'Computer Science',
  true
);

-- Verify insertion
SELECT id, email, full_name, role FROM users WHERE email IN ('admin@university.edu', 'lecturer@university.edu', 'student@university.edu');
