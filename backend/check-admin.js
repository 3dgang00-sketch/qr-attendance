const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/attendance.db');
const db = new Database(dbPath);

// Check admin user role
try {
  const admin = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get('admin@university.edu');
  console.log('Admin user:');
  console.log(JSON.stringify(admin, null, 2));
} catch (err) {
  console.log('Error:', err.message);
}

db.close();
