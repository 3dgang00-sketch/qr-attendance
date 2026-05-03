const pool = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Test data
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

    for (const user of testUsers) {
      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(user.password, 10);

        // Check if user exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existingUser.rows.length === 0) {
          // Insert user if not exists
          await pool.query(
            'INSERT INTO users (user_id, email, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5, $6)',
            [user.userId, user.email, hashedPassword, user.fullName, user.role, user.department]
          );
          console.log(`✅ Created user: ${user.email} (${user.role})`);
        } else {
          console.log(`⏭️  User already exists: ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Error seeding user ${user.email}:`, err.message);
      }
    }

    console.log('✅ Database seeding completed!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@university.edu / admin123');
    console.log('   Lecturer: lecturer@university.edu / lecturer123');
    console.log('   Student: student@university.edu / student123');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedDatabase();
