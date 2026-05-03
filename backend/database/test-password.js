const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/attendance.db');
const db = new Database(dbPath);

async function testLogin() {
  try {
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get('admin@university.edu');
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:', user.email);
    console.log('   Password hash:', user.password_hash);

    const passwordToTest = 'admin123';
    const match = await bcrypt.compare(passwordToTest, user.password_hash);
    
    console.log('\n🔐 Password Comparison:');
    console.log('   Testing password: "' + passwordToTest + '"');
    console.log('   Result:', match ? '✅ MATCH' : '❌ NO MATCH');

    if (!match) {
      // Try to hash the password again and compare
      const newHash = await bcrypt.hash(passwordToTest, 10);
      console.log('\n   New hash of "admin123":', newHash);
      const newMatch = await bcrypt.compare(passwordToTest, newHash);
      console.log('   New hash matches:', newMatch ? '✅ YES' : '❌ NO');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  db.close();
  process.exit(0);
}

testLogin();
