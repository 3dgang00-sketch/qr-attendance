const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  // First connect as postgres user to create database if needed
  const clientConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    database: 'postgres' // Connect to default postgres database first
  };

  // Only add password if it's not empty
  if (process.env.DB_PASSWORD) {
    clientConfig.password = process.env.DB_PASSWORD;
  }

  const adminClient = new Client(clientConfig);

  try {
    console.log('🔗 Connecting to PostgreSQL...');
    await adminClient.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const dbCheckResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'attendance_db']
    );

    if (dbCheckResult.rows.length === 0) {
      console.log('📦 Creating attendance_db database...');
      await adminClient.query(`CREATE DATABASE "${process.env.DB_NAME || 'attendance_db'}"`);
      console.log('✅ Database created');
    } else {
      console.log('✅ Database already exists');
    }

    await adminClient.end();

    // Now connect to the attendance_db and load schema
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      database: process.env.DB_NAME || 'attendance_db'
    };

    // Only add password if it's not empty
    if (process.env.DB_PASSWORD) {
      dbConfig.password = process.env.DB_PASSWORD;
    }

    const dbClient = new Client(dbConfig);

    console.log('🔗 Connecting to attendance_db...');
    await dbClient.connect();
    console.log('✅ Connected to attendance_db');

    // Load schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📁 Loading schema...');
    await dbClient.query(schema);
    console.log('✅ Schema loaded');

    // Add test users
    console.log('👤 Adding test users...');
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
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        // Check if user exists
        const existCheck = await dbClient.query(
          'SELECT id FROM users WHERE email = $1',
          [user.email]
        );

        if (existCheck.rows.length === 0) {
          await dbClient.query(
            'INSERT INTO users (user_id, email, password_hash, full_name, role, department) VALUES ($1, $2, $3, $4, $5, $6)',
            [user.userId, user.email, hashedPassword, user.fullName, user.role, user.department]
          );
          console.log(`✅ Created: ${user.email} (${user.role})`);
        } else {
          console.log(`⏭️  Exists: ${user.email}`);
        }
      } catch (err) {
        console.error(`❌ Error with ${user.email}:`, err.message);
      }
    }

    await dbClient.end();

    console.log('\n✅ Database setup complete!');
    console.log('\n📝 Test Credentials:');
    console.log('   Admin: admin@university.edu / admin123');
    console.log('   Lecturer: lecturer@university.edu / lecturer123');
    console.log('   Student: student@university.edu / student123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setupDatabase();
