#!/usr/bin/env node

/**
 * Development utility: Send credentials to a user by email
 * Usage: node send-credentials.js <user_id> <email>
 */

const pool = require('./src/config/database');
const bcrypt = require('bcryptjs');
const { generateTemporaryPassword, generateUsername } = require('./src/utils/credentialsGenerator');
const { emailService } = require('./src/utils/emailService');

async function sendCredentialsToUser() {
  try {
    const userId = process.argv[2];
    const email = process.argv[3];

    if (!userId || !email) {
      console.log('Usage: node send-credentials.js <user_id> <email>');
      console.log('Example: node send-credentials.js STUDENT_1234567890 user@example.com');
      process.exit(1);
    }

    console.log(`\n🔄 Fetching user: ${userId}...`);

    // Get user details
    const userResult = await pool.query(
      'SELECT id, user_id, email, full_name, role FROM users WHERE user_id = ?',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✓ Found user: ${user.full_name} (${user.role})`);

    // Generate temporary credentials
    const tempPassword = generateTemporaryPassword();
    const username = generateUsername(email);
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    console.log(`\n📝 Generated Credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Temp Password: ${tempPassword}`);

    // Update user with new temporary password
    await pool.query(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [tempPasswordHash, userId]
    );
    console.log(`✓ Password updated in database`);

    // Send credentials email
    console.log(`\n📧 Sending credentials email to ${email}...`);
    const emailResult = await emailService.sendCredentialsEmail(email, user.full_name, username, tempPassword);

    if (emailResult.success) {
      console.log(`✅ Credentials sent successfully to ${email}`);
      console.log(`\n✓ Message ID: ${emailResult.messageId}`);
    } else {
      console.warn(`⚠️  Email service not configured or failed: ${emailResult.message}`);
      console.log(`\n📋 Credentials to send manually:`);
      console.log(`   Email: ${email}`);
      console.log(`   Username: ${username}`);
      console.log(`   Temporary Password: ${tempPassword}`);
    }

    console.log(`\n💡 User should change password after first login`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error sending credentials:', err.message);
    process.exit(1);
  }
}

sendCredentialsToUser();
