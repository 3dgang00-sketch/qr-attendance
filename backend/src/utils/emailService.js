const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send absence notification email
async function sendAbsenceNotification(studentEmail, studentName, courseName, sessionDate) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Absence Notification - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Attendance Alert</h2>
          <p>Dear ${studentName},</p>
          <p>This is to notify you that you were marked <strong>absent</strong> for the following class:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Date:</strong> ${sessionDate}</p>
          </div>
          <p>If you believe this is an error, please contact your lecturer or department administrator.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Attendance Management System.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Absence notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending absence notification:', error);
    return { success: false, error: error.message };
  }
}

// Send low attendance warning
async function sendLowAttendanceWarning(studentEmail, studentName, courseName, attendancePercentage, requiredPercentage = 75) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: `Low Attendance Warning - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ff9800;">⚠️ Low Attendance Warning</h2>
          <p>Dear ${studentName},</p>
          <p>Your attendance in <strong>${courseName}</strong> has fallen below the required threshold.</p>
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p><strong>Current Attendance:</strong> ${attendancePercentage}%</p>
            <p><strong>Required Attendance:</strong> ${requiredPercentage}%</p>
            <p><strong>Deficit:</strong> ${(requiredPercentage - attendancePercentage).toFixed(2)}%</p>
          </div>
          <p>Please ensure you attend upcoming classes to improve your attendance record.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Attendance Management System.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Low attendance warning sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending low attendance warning:', error);
    return { success: false, error: error.message };
  }
}

// Send session started notification to enrolled students
async function sendSessionStartedNotification(studentEmails, courseName, sessionDate, roomLocation) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email notification.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      bcc: studentEmails.join(','),
      subject: `Class Session Started - ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">📚 Class Session Started</h2>
          <p>A class session has just started. Please mark your attendance by scanning the QR code.</p>
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Course:</strong> ${courseName}</p>
            <p><strong>Date:</strong> ${sessionDate}</p>
            <p><strong>Location:</strong> ${roomLocation || 'See course schedule'}</p>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Attendance Management System.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Session started notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending session notification:', error);
    return { success: false, error: error.message };
  }
}

// Send email verification link for registration
async function sendVerificationEmail(email, fullName, verificationLink) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email verification.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - Attendance Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2196f3;">Email Verification Required</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for registering for the Attendance Management System. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; padding: 12px 30px; background-color: #2196f3; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify Email
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Or copy and paste this link:</p>
          <p style="color: #2196f3; word-break: break-all; font-size: 12px;">${verificationLink}</p>
          <p style="color: #ff6b6b; margin-top: 20px;"><strong>Note:</strong> This link will expire in 24 hours.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you didn't register for this account, please ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

// Send registration approval email (deprecated - use sendCredentialsEmail instead)
async function sendApprovalEmail(email, fullName) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email approval.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Registration Approved - Attendance Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">✓ Registration Approved</h2>
          <p>Hello ${fullName},</p>
          <p>Congratulations! Your registration request has been <strong>approved</strong> by our administrators.</p>
          <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4caf50;">
            <p>You can now log in to the Attendance Management System using your credentials.</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 12px 30px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Login Now
            </a>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Attendance Management System.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Approval email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending approval email:', error);
    return { success: false, error: error.message };
  }
}

// Send credentials email with username and temporary password
async function sendCredentialsEmail(email, fullName, username, tempPassword) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping credentials email.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Account Created - Login Credentials - Attendance Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4caf50;">✓ Account Created Successfully</h2>
          <p>Hello ${fullName},</p>
          <p>Congratulations! Your registration has been <strong>approved</strong> by our administrators. Your account is now ready to use.</p>
          
          <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #2196f3;">
            <h3 style="color: #1976d2; margin-top: 0;">Your Login Credentials</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; font-weight: bold; width: 120px;">Username:</td>
                <td style="padding: 10px; font-family: monospace; background-color: #fff; border: 1px solid #e0e0e0; border-radius: 3px;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Temporary Password:</td>
                <td style="padding: 10px; font-family: monospace; background-color: #fff; border: 1px solid #e0e0e0; border-radius: 3px;">${tempPassword}</td>
              </tr>
            </table>
            <p style="color: #d32f2f; margin: 15px 0 0 0; font-size: 12px;">
              ⚠️ <strong>Important:</strong> Please change your password after your first login for security.
            </p>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Next Steps:</h3>
            <ol>
              <li>Click the button below or go to the login page</li>
              <li>Enter your username and temporary password</li>
              <li>Update your password to something secure that only you know</li>
            </ol>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" style="display: inline-block; padding: 12px 30px; background-color: #4caf50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
              Log In Now
            </a>
          </div>

          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800;">
            <p style="margin: 0; color: #856404;"><strong>Security Reminder:</strong> Never share your credentials with anyone. Our administrators will never ask for your password.</p>
          </div>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            If you did not request this account or have questions, please contact the administration team immediately.
          </p>
          <p style="color: #999; font-size: 11px; margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            This is an automated message from the Attendance Management System. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Credentials email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending credentials email:', error);
    return { success: false, error: error.message };
  }
}

// Send registration rejection email
async function sendRejectionEmail(email, fullName, reason) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('Email service not configured. Skipping email rejection.');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Attendance System" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Registration Request Update - Attendance Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f44336;">Registration Request Status</h2>
          <p>Hello ${fullName},</p>
          <p>Thank you for your interest in the Attendance Management System. Unfortunately, your registration request has been <strong>reviewed and not approved at this time</strong>.</p>
          <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
            <p><strong>Reason:</strong></p>
            <p>${reason}</p>
          </div>
          <p>If you have questions or would like to reapply, please contact the administration team at your institution.</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated message from the Attendance Management System.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Rejection email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending rejection email:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendVerificationEmail,
  sendApprovalEmail,
  sendCredentialsEmail,
  sendRejectionEmail,
  sendAbsenceNotification,
  sendLowAttendanceWarning,
  sendSessionStartedNotification,
};

// Export as both named and default export
const emailService = module.exports;
emailService.default = emailService;
module.exports.emailService = emailService;
