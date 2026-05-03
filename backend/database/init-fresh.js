const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Create data folder if it doesn't exist
const dataFolder = path.join(__dirname, '../data');
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, 'attendance.db');

// Initialize database
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

async function initDatabase() {
  try {
    console.log('🔄 Cleaning and reinitializing SQLite database...');

    // Drop all tables
    db.exec(`
      DROP TABLE IF EXISTS attendance_records;
      DROP TABLE IF EXISTS attendance_overrides;
      DROP TABLE IF EXISTS attendance_reports;
      DROP TABLE IF EXISTS scan_attempts_log;
      DROP TABLE IF EXISTS qr_codes;
      DROP TABLE IF EXISTS class_sessions;
      DROP TABLE IF EXISTS geofence_zones;
      DROP TABLE IF EXISTS course_enrollments;
      DROP TABLE IF EXISTS courses;
      DROP TABLE IF EXISTS users;
    `);
    console.log('✅ Old tables dropped');

    // Read and execute SQLite schema
    const schemaPath = path.join(__dirname, './schema-sqlite.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    db.exec(schema);
    console.log('✅ New schema created');

    // Add test users
    const testUsers = [
      {
        userId: 'ADMIN001',
        email: 'admin@university.edu',
        password: 'admin123',
        fullName: 'Admin User',
        role: 'SUPER_ADMIN',
        department: 'Administration'
      },
      {
        userId: 'TEMP_LECTURER_001',
        email: 'lecturer@university.edu',
        password: 'lecturer123',
        fullName: 'Dr. John Lecturer',
        role: 'LECTURER',
        department: 'Computer Science'
      },
      {
        userId: 'TEMP_STUDENT_001',
        email: 'student@university.edu',
        password: 'student123',
        fullName: 'Jane Student',
        role: 'STUDENT',
        department: 'Computer Science'
      }
    ];

    console.log('👤 Adding test users...');
    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      db.prepare(
        'INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)'
      ).run(user.userId, user.email, hashedPassword, user.fullName, user.role, user.department);
      
      console.log(`✅ Created: ${user.email} (${user.role})`);
    }

    // Verify users
    const users = db.prepare('SELECT id, email, full_name, role FROM users').all();
    console.log('\n📋 Verification - Users in database:');
    users.forEach(u => {
      console.log(`   ID: ${u.id}, Email: ${u.email}, Role: ${u.role}`);
    });

    console.log('\n✅ Database initialization complete!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@university.edu / admin123');
    console.log('   Lecturer: lecturer@university.edu / lecturer123');
    console.log('   Student: student@university.edu / student123');

    db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Initialization failed:', err.message);
    console.error(err);
    db.close();
    process.exit(1);
  }
}

initDatabase();
