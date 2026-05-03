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

module.exports = {
  sendAbsenceNotification,
  sendLowAttendanceWarning,
  sendSessionStartedNotification,
};
