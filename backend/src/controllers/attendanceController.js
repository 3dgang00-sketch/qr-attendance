const pool = require('../config/database');
const { decryptToken } = require('../utils/qrCode');
const { validateGeofence } = require('../utils/geofencing');
const { generateDeviceFingerprint } = require('../utils/deviceFingerprint');

// Scan QR code and mark attendance
async function scanQRCode(req, res) {
  try {
    const { qrToken, gpsLatitude, gpsLongitude, deviceInfo } = req.body;
    const studentId = req.user.id;

    if (!qrToken || gpsLatitude === undefined || gpsLongitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: QR code, GPS coordinates' });
    }

    // Decrypt the QR token
    const decrypted = decryptToken(qrToken);
    if (!decrypted) {
      await logScanAttempt(studentId, null, 'INVALID_TOKEN', gpsLatitude, gpsLongitude, 'Invalid QR token', deviceInfo);
      return res.status(400).json({ error: 'Invalid QR code' });
    }

    // Extract session ID from token
    const sessionId = decrypted.split(':')[0];

    // Find QR code in database
    const qrResult = await pool.query(
      'SELECT * FROM qr_codes WHERE qr_token = ?',
      [qrToken]
    );

    if (!qrResult.rows || qrResult.rows.length === 0) {
      await logScanAttempt(studentId, sessionId, 'INVALID_TOKEN', gpsLatitude, gpsLongitude, 'QR token not found', deviceInfo);
      return res.status(400).json({ error: 'QR code not found' });
    }

    const qrCode = qrResult.rows[0];

    // Check if QR code is expired
    if (new Date() > new Date(qrCode.expires_at)) {
      await logScanAttempt(studentId, sessionId, 'EXPIRED_QR', gpsLatitude, gpsLongitude, 'QR code expired', deviceInfo);
      return res.status(400).json({ error: 'QR code has expired' });
    }

    // Get session details including geofence zone
    const sessionResult = await pool.query(
      'SELECT * FROM class_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (!sessionResult.rows || sessionResult.rows.length === 0) {
      await logScanAttempt(studentId, sessionId, 'INVALID_TOKEN', gpsLatitude, gpsLongitude, 'Session not found', deviceInfo);
      return res.status(400).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Check for duplicate attendance (prevent double scanning)
    const duplicateResult = await pool.query(
      'SELECT * FROM attendance_records WHERE student_id = ? AND session_id = ?',
      [studentId, sessionId]
    );

    if (duplicateResult && duplicateResult.rows && duplicateResult.rows.length > 0) {
      await logScanAttempt(studentId, sessionId, 'DUPLICATE', gpsLatitude, gpsLongitude, 'Student already marked present', deviceInfo);
      return res.status(409).json({ error: 'Attendance already marked for this session', attendanceStatus: duplicateResult.rows[0].attendance_status });
    }

    // Validate geofence
    let geofenceValidation = null;
    let geofenceWarning = null;

    let geofence = null;

    if (session.geofence_zone_id) {
      const geofenceResult = await pool.query(
        'SELECT * FROM geofence_zones WHERE id = ? AND is_active = 1',
        [session.geofence_zone_id]
      );
      geofence = geofenceResult.rows?.[0] || null;
    }

    // Fallback: when session has no linked geofence (or linked one is inactive),
    // use the nearest active admin geofence so attendance still works by campus area.
    if (!geofence) {
      const activeZonesResult = await pool.query(
        'SELECT * FROM geofence_zones WHERE is_active = 1'
      );
      const activeZones = activeZonesResult.rows || [];

      if (activeZones.length > 0) {
        geofence = activeZones.reduce((nearestZone, zone) => {
          const validation = validateGeofence(
            gpsLatitude,
            gpsLongitude,
            Number(zone.latitude),
            Number(zone.longitude),
            zone.radius_meters
          );

          if (!nearestZone || validation.distance < nearestZone.distance) {
            return { ...zone, distance: validation.distance };
          }
          return nearestZone;
        }, null);

        geofenceWarning = session.geofence_zone_id
          ? 'Assigned class geofence unavailable, validating against nearest active campus zone'
          : 'Class geofence not linked, validating against nearest active campus zone';
      }
    }

    if (!geofence) {
      // Geofence not configured - allow with warning if flag is set
      if (process.env.ALLOW_MISSING_GEOFENCE === 'true') {
        geofenceWarning = 'Location verification skipped - no active geofence configured';
        geofenceValidation = { isWithin: true, distance: 0, radiusMeters: 0 };
        await logScanAttempt(studentId, sessionId, 'SUCCESS', gpsLatitude, gpsLongitude, 'Attendance marked - geofence skipped', deviceInfo);
      } else {
        await logScanAttempt(studentId, sessionId, 'OUTSIDE_GEOFENCE', gpsLatitude, gpsLongitude, 'No active geofence zone found', deviceInfo);
        return res.status(400).json({ error: 'Location check unavailable. Contact your instructor to configure the classroom location.' });
      }
    } else {
      geofenceValidation = validateGeofence(
        gpsLatitude,
        gpsLongitude,
        Number(geofence.latitude),
        Number(geofence.longitude),
        geofence.radius_meters
      );

      if (!geofenceValidation.isWithin) {
        await logScanAttempt(
          studentId,
          sessionId,
          'OUTSIDE_GEOFENCE',
          gpsLatitude,
          gpsLongitude,
          `Student is ${geofenceValidation.distance}m away from geofence (radius: ${geofenceValidation.radiusMeters}m)`,
          deviceInfo
        );
        return res.status(403).json({
          error: `You're ${Math.round(geofenceValidation.distance)}m away from campus (max: ${geofenceValidation.radiusMeters}m). Move closer to campus.`,
          distance: geofenceValidation.distance,
          allowedRadius: geofenceValidation.radiusMeters,
        });
      }
    }

    // Generate device fingerprint
    const deviceFingerprint = generateDeviceFingerprint(deviceInfo || {
      userAgent: req.headers['user-agent'] || '',
      language: req.headers['accept-language'] || '',
      timezone: 'UTC',
      platform: 'web',
    });

    // Mark attendance
    const attendanceResult = await pool.query(
      'INSERT INTO attendance_records (student_id, session_id, scan_time, gps_latitude, gps_longitude, is_within_geofence, attendance_status, device_fingerprint, device_info, qr_token_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [studentId, sessionId, new Date().toISOString(), gpsLatitude, gpsLongitude, 1, 'PRESENT', deviceFingerprint, JSON.stringify(deviceInfo), qrToken]
    );

    // Log successful scan (only if we didn't already log it during geofence skip)
    if (!geofenceWarning) {
      await logScanAttempt(studentId, sessionId, 'SUCCESS', gpsLatitude, gpsLongitude, 'Attendance marked successfully', deviceInfo);
    }

    // Mark QR code as used (optional - can be reused for multiple students)
    // await pool.query('UPDATE qr_codes SET is_used = 1 WHERE qr_token = ?', [qrToken]);

    const response = {
      message: 'Attendance marked successfully',
      attendance: {
        id: attendanceResult.id || attendanceResult,
        status: 'PRESENT',
        scanTime: new Date().toISOString(),
        location: {
          latitude: gpsLatitude,
          longitude: gpsLongitude,
          distance: geofenceValidation?.distance || 0,
        },
      },
    };

    if (geofenceWarning) {
      response.warning = geofenceWarning;
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ error: err.message });
  }
}

// Log scan attempt (for audit trail)
async function logScanAttempt(studentId, sessionId, status, latitude, longitude, errorMessage, deviceInfo) {
  try {
    await pool.query(
      'INSERT INTO scan_attempts_log (student_id, session_id, attempt_time, scan_status, gps_latitude, gps_longitude, error_message, device_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [studentId, sessionId, new Date().toISOString(), status, latitude, longitude, errorMessage, JSON.stringify(deviceInfo)]
    );
  } catch (err) {
    console.error('Error logging scan attempt:', err);
  }
}

// Get attendance record
async function getAttendanceRecord(req, res) {
  try {
    const { recordId } = req.params;

    const result = await pool.query(
      'SELECT * FROM attendance_records WHERE id = ?',
      [recordId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get attendance for session
async function getSessionAttendance(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      'SELECT ar.*, u.user_id, u.full_name, u.email FROM attendance_records ar JOIN users u ON ar.student_id = u.id WHERE ar.session_id = ? ORDER BY ar.scan_time ASC',
      [sessionId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get student attendance history
async function getStudentAttendanceHistory(req, res) {
  try {
    const { studentId } = req.params;
    const { courseId, fromDate, toDate, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT
        ar.*,
        c.course_code,
        c.course_name,
        cs.class_date,
        cs.start_time,
        cs.end_time,
        l.full_name AS lecturer_name
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN users l ON cs.lecturer_id = l.id
      WHERE ar.student_id = ?
    `;
    const params = [studentId];

    if (courseId) {
      query += ` AND c.id = ?`;
      params.push(courseId);
    }

    if (fromDate) {
      query += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    query += ` ORDER BY cs.class_date DESC, cs.start_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  scanQRCode,
  logScanAttempt,
  getAttendanceRecord,
  getSessionAttendance,
  getStudentAttendanceHistory,
};
