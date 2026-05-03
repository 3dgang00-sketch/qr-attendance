const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/attendance.db');
const db = new Database(dbPath);

console.log('Testing query conversion...\n');

// Test 1: Direct SELECT
console.log('Test 1: SELECT with ? placeholder');
const stmt1 = db.prepare('SELECT * FROM users WHERE email = ?');
const result1 = stmt1.all('admin@university.edu');
console.log('Result:', result1.length > 0 ? '✅ Found' : '❌ Not found');
console.log('User:', result1[0]?.email);

// Test 2: Convert $1 to ?
console.log('\nTest 2: Query conversion from $1 to ?');

function convertQuery(sql) {
  let converted = sql;
  let paramIndex = 1;
  
  while (converted.includes(`$${paramIndex}`)) {
    converted = converted.replace(`$${paramIndex}`, '?');
    paramIndex++;
  }
  
  return converted;
}

const originalSql = 'SELECT * FROM users WHERE email = $1';
const convertedSql = convertQuery(originalSql);
console.log('Original:', originalSql);
console.log('Converted:', convertedSql);

const stmt2 = db.prepare(convertedSql);
const result2 = stmt2.all('admin@university.edu');
console.log('Result:', result2.length > 0 ? '✅ Found' : '❌ Not found');
console.log('User:', result2[0]?.email);

// Test 3: Test is_active field
console.log('\nTest 3: Checking is_active field');
const stmt3 = db.prepare('SELECT id, email, password_hash, is_active FROM users WHERE email = ?');
const result3 = stmt3.get('admin@university.edu');
console.log('User:', result3);
console.log('is_active:', result3?.is_active, 'Type:', typeof result3?.is_active);

db.close();
