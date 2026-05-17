#!/usr/bin/env node

/**
 * Development utility: Verify all pending registration emails
 * This automatically sets is_email_verified = 1 for all PENDING requests
 * Use this in development when email service is not configured
 */

const pool = require('./src/config/database');

async function verifyPendingEmails() {
  try {
    console.log('🔄 Verifying all pending registration emails...\n');

    // Get all pending requests
    const result = await pool.query(
      'SELECT id, email, full_name, request_status FROM user_registration_requests WHERE request_status = ? AND is_email_verified = 0',
      ['PENDING']
    );

    if (!result.rows || result.rows.length === 0) {
      console.log('✓ No pending requests to verify');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} pending request(s):\n`);

    // Verify each request
    for (const req of result.rows) {
      await pool.query(
        'UPDATE user_registration_requests SET request_status = ?, is_email_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['EMAIL_VERIFIED', req.id]
      );
      console.log(`✓ ${req.email} (${req.full_name}) - Now EMAIL_VERIFIED`);
    }

    console.log(`\n✅ Successfully verified ${result.rows.length} request(s)`);
    console.log('📌 Admins can now approve/reject these requests');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error verifying emails:', err.message);
    process.exit(1);
  }
}

verifyPendingEmails();
