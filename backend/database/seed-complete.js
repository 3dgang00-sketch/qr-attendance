/**
 * Complete Database Seeding Script
 * Creates users, courses, geofence zones, and class sessions
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Path to database
const dataFolder = path.join(__dirname, '../data');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, 'attendance.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

async function seedDatabase() {
  try {
    console.log('🌱 Starting complete database seeding...\n');

    // ==================== USERS ====================
    console.log('👥 Creating users...');
    const users = [
      {
        user_id: 'ADMIN001',
        email: 'admin@university.edu',
        password: 'admin123',
        full_name: 'Admin User',
        role: 'SUPER_ADMIN',
        department: 'Administration'
      },
      {
        user_id: 'LECTURER001',
        email: 'lecturer@university.edu',
        password: 'lecturer123',
        full_name: 'Dr. John Lecturer',
        role: 'LECTURER',
        department: 'Computer Science'
      },
      {
        user_id: 'STUDENT001',
        email: 'student@university.edu',
        password: 'student123',
        full_name: 'Jane Student',
        role: 'STUDENT',
        department: 'Computer Science'
      },
      {
        user_id: 'STUDENT002',
        email: 'student2@university.edu',
        password: 'student123',
        full_name: 'John Doe',
        role: 'STUDENT',
        department: 'Computer Science'
      }
    ];

    for (const user of users) {
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        db.prepare(
          'INSERT INTO users (user_id, email, password_hash, full_name, role, department) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(user.user_id, user.email, hashedPassword, user.full_name, user.role, user.department);
        
        console.log(`  ✓ Created ${user.role}: ${user.email}`);
      } else {
        console.log(`  ⏭️  User exists: ${user.email}`);
      }
    }

    // ==================== GEOFENCE ZONES ====================
    console.log('\n📍 Creating geofence zones...');
    const zones = [
      {
        zone_name: 'HARISANKARPUR',
        latitude: 22.237708,
        longitude: 88.383377,
        radius_meters: 241,
        building_name: 'BAIDYA NIBAS',
        description: 'Main campus building'
      },
      {
        zone_name: 'CS_BUILDING',
        latitude: 22.237800,
        longitude: 88.383500,
        radius_meters: 150,
        building_name: 'COMPUTER_SCIENCE',
        description: 'Computer Science Department'
      },
      {
        zone_name: 'LIBRARY',
        latitude: 22.237600,
        longitude: 88.383200,
        radius_meters: 100,
        building_name: 'CENTRAL_LIBRARY',
        description: 'Central Library Building'
      }
    ];

    for (const zone of zones) {
      const existing = db.prepare('SELECT id FROM geofence_zones WHERE zone_name = ?').get(zone.zone_name);
      
      if (!existing) {
        db.prepare(
          'INSERT INTO geofence_zones (zone_name, latitude, longitude, radius_meters, building_name, description) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(zone.zone_name, zone.latitude, zone.longitude, zone.radius_meters, zone.building_name, zone.description);
        
        console.log(`  ✓ Created zone: ${zone.zone_name}`);
      } else {
        console.log(`  ⏭️  Zone exists: ${zone.zone_name}`);
      }
    }

    // ==================== COURSES ====================
    console.log('\n📚 Creating courses...');
    const courses = [
      {
        course_code: 'CS201',
        course_name: 'Data Structures and Algorithms',
        department: 'Computer Science',
        credits: 4,
        semester: 'Spring 2026',
        academic_year: '2025-2026'
      },
      {
        course_code: 'CS301',
        course_name: 'Database Management Systems',
        department: 'Computer Science',
        credits: 3,
        semester: 'Spring 2026',
        academic_year: '2025-2026'
      }
    ];

    for (const course of courses) {
      const existingCourse = db.prepare('SELECT id FROM courses WHERE course_code = ?').get(course.course_code);
      
      if (!existingCourse) {
        // Get lecturer ID
        const lecturer = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('LECTURER');
        
        db.prepare(
          'INSERT INTO courses (course_code, course_name, department, lecturer_id, credits, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(course.course_code, course.course_name, course.department, lecturer?.id || 1, course.credits, course.semester, course.academic_year);
        
        console.log(`  ✓ Created course: ${course.course_code}`);
      } else {
        console.log(`  ⏭️  Course exists: ${course.course_code}`);
      }
    }

    // ==================== COURSE ENROLLMENTS ====================
    console.log('\n📝 Creating course enrollments...');
    const courseCodes = ['CS201', 'CS301'];
    const students = db.prepare('SELECT id FROM users WHERE role = ? ORDER BY id').all('STUDENT');
    const coursesData = db.prepare('SELECT id, course_code FROM courses WHERE course_code IN (?, ?)').all(...courseCodes);

    for (const course of coursesData) {
      for (const student of students) {
        const existing = db.prepare('SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?').get(student.id, course.id);
        
        if (!existing) {
          db.prepare('INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)').run(student.id, course.id);
          console.log(`  ✓ Enrolled student ${student.id} in ${course.course_code}`);
        }
      }
    }

    // ==================== CLASS SESSIONS ====================
    console.log('\n🎓 Creating class sessions...');
    const lecturer = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('LECTURER');
    const courseData = db.prepare('SELECT id FROM courses WHERE course_code = ? LIMIT 1').get('CS201');
    const geofenceData = db.prepare('SELECT id FROM geofence_zones WHERE zone_name = ? LIMIT 1').get('HARISANKARPUR');

    const today = new Date().toISOString().split('T')[0];
    const sessions = [
      {
        course_id: courseData?.id || 1,
        lecturer_id: lecturer?.id || 1,
        class_date: today,
        start_time: '09:00:00',
        end_time: '10:30:00',
        room_location: 'Room 101',
        geofence_zone_id: geofenceData?.id || 1,
        status: 'SCHEDULED'
      },
      {
        course_id: courseData?.id || 1,
        lecturer_id: lecturer?.id || 1,
        class_date: today,
        start_time: '11:00:00',
        end_time: '12:30:00',
        room_location: 'Room 102',
        geofence_zone_id: geofenceData?.id || 1,
        status: 'SCHEDULED'
      }
    ];

    for (const session of sessions) {
      const sessionId = uuidv4();
      db.prepare(
        'INSERT INTO class_sessions (session_id, course_id, lecturer_id, class_date, start_time, end_time, room_location, geofence_zone_id, session_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(sessionId, session.course_id, session.lecturer_id, session.class_date, session.start_time, session.end_time, session.room_location, session.geofence_zone_id, 'SCHEDULED');
      
      console.log(`  ✓ Created session: ${sessionId.substring(0, 8)}... at ${session.start_time}`);
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📝 Test Credentials:');
    console.log('   Admin:    admin@university.edu / admin123');
    console.log('   Lecturer: lecturer@university.edu / lecturer123');
    console.log('   Student:  student@university.edu / student123');
    console.log('   Student:  student2@university.edu / student123\n');
    console.log('📍 Geofence Location:');
    console.log('   Latitude:  22.237708');
    console.log('   Longitude: 88.383377');
    console.log('   Radius:    241 meters\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

seedDatabase();
