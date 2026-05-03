const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../data/attendance.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// Check if users table exists
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
console.log('Tables:', tables.length > 0 ? 'users table exists' : 'users table NOT found');

// Get all users
const users = db.prepare('SELECT id, email, full_name, role FROM users').all();
console.log('\n📋 Users in database:');
console.log(JSON.stringify(users, null, 2));

// Check admin user specifically
const adminUser = db.prepare('SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?').get('admin@university.edu');
console.log('\n👤 Admin user details:');
if (adminUser) {
  console.log('  ID:', adminUser.id);
  console.log('  Email:', adminUser.email);
  console.log('  Full Name:', adminUser.full_name);
  console.log('  Role:', adminUser.role);
  console.log('  Password Hash Length:', adminUser.password_hash?.length || 'null');
  console.log('  Password Hash (first 20 chars):', adminUser.password_hash?.substring(0, 20) || 'null');
} else {
  console.log('  ❌ User not found!');
}

db.close();
