const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/attendance.db');
const db = new Database(dbPath);

// Check if table exists
try {
  const row = db.prepare('SELECT id, email, verification_token, request_status, is_email_verified FROM user_registration_requests WHERE email = ?').get('anjana@gmail.com');
  if (row) {
    console.log('Registration Request Found:');
    console.log(JSON.stringify(row, null, 2));
  } else {
    console.log('No registration request found for anjana@gmail.com');
  }
} catch (err) {
  console.log('Error querying registration requests:');
  console.log(err.message);
  
  // List all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('\nAvailable tables:');
  console.log(tables.map(t => t.name).join(', '));
}

db.close();
