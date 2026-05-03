const { Client } = require('pg');
require('dotenv').config();

const passwords = ['shan1234', 'password', '', 'postgres', 'admin'];

async function testPasswords() {
  for (const pwd of passwords) {
    const config = {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      database: 'postgres',
    };

    if (pwd) {
      config.password = pwd;
    }

    const client = new Client(config);
    
    try {
      console.log(`\n🔄 Testing password: "${pwd || '(empty)'}"`);
      await client.connect();
      const result = await client.query('SELECT version();');
      console.log('✅ SUCCESS with password:', `"${pwd || '(empty)'}"`);
      console.log('   PostgreSQL:', result.rows[0].version.split(',')[0]);
      await client.end();
      return pwd;
    } catch (err) {
      console.log(`❌ Failed:`, err.message.split('\n')[0]);
      try { await client.end(); } catch (e) {}
    }
  }

  console.log('\n❌ No working password found!');
  process.exit(1);
}

testPasswords().then(pwd => {
  console.log(`\n✅ Update your .env with password: ${pwd ? `shan1234` : '(leave empty)'}`);
  process.exit(0);
});
