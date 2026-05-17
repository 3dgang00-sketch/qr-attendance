const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/attendance.db');
const db = new Database(dbPath);

const admin = db.prepare('SELECT id, email, role FROM users WHERE email LIKE ? ORDER BY id LIMIT 5').all('%admin%');
console.log(JSON.stringify(admin, null, 2));

db.close();
