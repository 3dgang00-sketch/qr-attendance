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
    console.log('🔄 Initializing SQLite database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, './schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const stmt of statements) {
      try {
        db.exec(stmt);
      } catch (err) {
        // Ignore table already exists errors
        if (!err.message.includes('already exists')) {
          console.error('❌ Schema error:', err.message);
        }
      }
    }

    console.log('✅ Schema initialized');

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
      try {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Check if user exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(user.email);
        
        if (!existingUser) {
          db.prepare(
            'INSERT INTO users (user_id, email, password_hash, full_name, role, department) VALUES (?, ?, ?, ?, ?, ?)'
          ).run(user.userId, user.email, hashedPassword, user.fullName, user.role, user.department);
          
          console.log(`✅ Created: ${user.email} (${user.role})`);
        } else {
          console.log(`⏭️  Exists: ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Error with ${user.email}:`, err.message);
      }
    }

    console.log('\n✅ Database initialization complete!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@university.edu / admin123');
    console.log('   Lecturer: lecturer@university.edu / lecturer123');
    console.log('   Student: student@university.edu / student123');

    db.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Initialization failed:', err.message);
    db.close();
    process.exit(1);
  }
}

initDatabase();
