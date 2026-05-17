#!/usr/bin/env node

/**
 * Test the email service configuration
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailService() {
  try {
    console.log('🔍 Testing Email Service Configuration...\n');

    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log(`   EMAIL_HOST: ${process.env.EMAIL_HOST || 'NOT SET'}`);
    console.log(`   EMAIL_PORT: ${process.env.EMAIL_PORT || 'NOT SET'}`);
    console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || 'NOT SET'}`);
    console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✓ SET' : '❌ NOT SET'}`);
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'NOT SET'}\n`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('❌ Email credentials not configured in .env file!');
      process.exit(1);
    }

    // Create transporter
    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Verify connection
    console.log('🔌 Verifying SMTP connection...\n');
    const verified = await transporter.verify();

    if (verified) {
      console.log('✅ SMTP connection verified successfully!');
      console.log(`   Server: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
      console.log(`   User: ${process.env.EMAIL_USER}\n`);

      // Send test email
      console.log('📧 Sending test email...\n');
      const info = await transporter.sendMail({
        from: `"Attendance System Test" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: 'Test Email - Attendance Management System',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4caf50;">✅ Email Service Working!</h2>
            <p>This is a test email from the Attendance Management System.</p>
            <p>If you received this email, your email configuration is working correctly.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Sent at: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
      });

      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   Response: ${info.response}\n`);

      console.log('🎉 Email service is fully functional!\n');
      console.log('💡 Next steps:');
      console.log('   1. Check your email inbox for the test message');
      console.log('   2. Try registering a new user');
      console.log('   3. Verification email should arrive shortly\n');

      process.exit(0);
    } else {
      console.error('❌ Failed to verify SMTP connection!');
      console.error('   Check your email credentials and SMTP settings.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error testing email service:', err.message);
    console.error('\n📝 Troubleshooting:');
    console.error('   1. Verify EMAIL_USER and EMAIL_PASSWORD in .env');
    console.error('   2. For Gmail: Use App Password (not regular password)');
    console.error('   3. Enable 2-Factor Authentication on your Google account');
    console.error('   4. Check firewall/antivirus blocking SMTP port 587');
    console.error('   5. Try connecting from a different network\n');
    console.error('Full error:', err);
    process.exit(1);
  }
}

testEmailService();
