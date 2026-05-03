const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { generateQRCodeToken, generateQRCodeImage } = require('../utils/qrCode');
const { sendSessionStartedNotification } = require('../utils/emailService');

// Create a class session
async function createSession(req, res) {
  try {
    const { courseId, classDate, startTime, endTime, roomLocation, geofenceZoneId } = req.body;
    const lecturerId = req.user.id;

    if (!courseId || !classDate || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sessionId = uuidv4();

    const result = await pool.query(
      'INSERT INTO class_sessions (session_id, course_id, lecturer_id, class_date, start_time, end_time, room_location, geofence_zone_id, session_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sessionId, courseId, lecturerId, classDate, startTime, endTime, roomLocation, geofenceZoneId, 'SCHEDULED']
    );

    res.status(201).json({
      message: 'Class session created successfully',
      session: result.rows?.[0] || result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Start a class session and generate QR code
async function startSession(req, res) {
  try {
    const { sessionId, classDate, startTime, endTime } = req.body;
    const expiryMinutes = parseInt(process.env.QR_CODE_EXPIRY_MINUTES) || 5;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    // Verify session exists and belongs to lecturer
    const sessionResult = await pool.query(
      'SELECT * FROM class_sessions WHERE session_id = ? AND lecturer_id = ?',
      [sessionId, req.user.id]
    );

    if (!sessionResult.rows || sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // Allow lecturer to set/override actual class timing before starting session
    if (classDate || startTime || endTime) {
      const updates = [];
      const values = [];
      if (classDate) {
        updates.push('class_date = ?');
        values.push(classDate);
      }
      if (startTime) {
        updates.push('start_time = ?');
        values.push(startTime);
      }
      if (endTime) {
        updates.push('end_time = ?');
        values.push(endTime);
      }
      if (updates.length > 0) {
        values.push(sessionId, req.user.id);
        await pool.query(
          `UPDATE class_sessions SET ${updates.join(', ')} WHERE session_id = ? AND lecturer_id = ?`,
          values
        );
      }
    }

    // Generate QR code token
    const qrToken = await generateQRCodeToken(sessionId, expiryMinutes);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save QR code to database
    await pool.query(
      'INSERT INTO qr_codes (qr_token, session_id, generated_at, expires_at) VALUES (?, ?, ?, ?)',
      [qrToken, sessionId, new Date().toISOString(), expiresAt.toISOString()]
    );

    // Update session status to ACTIVE
    await pool.query(
      'UPDATE class_sessions SET session_status = ? WHERE session_id = ?',
      ['ACTIVE', sessionId]
    );

    // Generate QR code image
    const qrImage = await generateQRCodeImage(qrToken);

    // Get course and enrolled students for email notification
    const courseQuery = `
      SELECT c.course_name, c.course_code, cs.room_location, cs.class_date
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_id = ?
    `;
    const courseResult = await pool.query(courseQuery, [sessionId]);
    
    if (courseResult.rows && courseResult.rows.length > 0) {
      const course = courseResult.rows[0];
      
      // Get enrolled students' emails
      const studentsQuery = `
        SELECT u.email
        FROM course_enrollments ce
        JOIN users u ON ce.student_id = u.id
        JOIN class_sessions cs ON ce.course_id = cs.course_id
        WHERE cs.session_id = ? AND u.is_active = 1
      `;
      const studentsResult = await pool.query(studentsQuery, [sessionId]);
      
      if (studentsResult.rows && studentsResult.rows.length > 0) {
        const studentEmails = studentsResult.rows.map(s => s.email);
        
        // Send notification email (non-blocking)
        sendSessionStartedNotification(
          studentEmails,
          `${course.course_code} - ${course.course_name}`,
          course.class_date,
          course.room_location
        ).catch(err => console.error('Email notification failed:', err));
      }
    }

    res.json({
      message: 'Session started, QR code generated',
      sessionId,
      qrToken,
      qrImage,
      expiresAt,
      expiryMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Refresh/generate new QR code
async function refreshQRCode(req, res) {
  try {
    const { sessionId } = req.body;
    const expiryMinutes = parseInt(process.env.QR_CODE_EXPIRY_MINUTES) || 5;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    // Verify session exists and belongs to lecturer
    const sessionResult = await pool.query(
      'SELECT * FROM class_sessions WHERE session_id = ? AND lecturer_id = ?',
      [sessionId, req.user.id]
    );

    if (!sessionResult.rows || sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    // Mark old codes as used
    await pool.query(
      'UPDATE qr_codes SET is_used = 1 WHERE session_id = ? AND is_used = 0',
      [sessionId]
    );

    // Generate new QR code token
    const qrToken = await generateQRCodeToken(sessionId, expiryMinutes);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save new QR code
    await pool.query(
      'INSERT INTO qr_codes (qr_token, session_id, generated_at, expires_at) VALUES (?, ?, ?, ?)',
      [qrToken, sessionId, new Date().toISOString(), expiresAt.toISOString()]
    );

    // Generate QR code image
    const qrImage = await generateQRCodeImage(qrToken);

    res.json({
      message: 'New QR code generated',
      sessionId,
      qrToken,
      qrImage,
      expiresAt,
      expiryMinutes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Close a class session
async function closeSession(req, res) {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing required field: sessionId' });
    }

    const result = await pool.query(
      'UPDATE class_sessions SET session_status = ? WHERE session_id = ? AND lecturer_id = ?',
      ['CLOSED', sessionId, req.user.id]
    );

    if (!result || result.changes === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    res.json({
      message: 'Session closed',
      session: result.rows?.[0] || result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get session details
async function getSession(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      'SELECT * FROM class_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all sessions for a course
async function getCourseSessions(req, res) {
  try {
    const { courseId } = req.params;

    const result = await pool.query(
      'SELECT * FROM class_sessions WHERE course_id = ? ORDER BY class_date DESC, start_time DESC',
      [courseId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all sessions for the logged-in lecturer
async function getLecturerSessions(req, res) {
  try {
    const lecturerId = req.user.id;

    const result = await pool.query(
      `SELECT cs.*, c.course_code, c.course_name, c.id as course_id
       FROM class_sessions cs
       JOIN courses c ON cs.course_id = c.id
       WHERE cs.lecturer_id = ?
       ORDER BY cs.class_date DESC, cs.start_time DESC`,
      [lecturerId]
    );

    res.json({
      data: result.rows || [],
      count: result.rows ? result.rows.length : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createSession,
  startSession,
  refreshQRCode,
  closeSession,
  getSession,
  getCourseSessions,
  getLecturerSessions,
};
