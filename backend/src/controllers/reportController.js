const pool = require('../config/database');
const { exportToCSV, exportToPDF, exportSessionAttendanceCSV } = require('../utils/exportService');
const path = require('path');

// Export attendance report as CSV
async function exportAttendanceCSV(req, res) {
  try {
    const { courseId, studentId, fromDate, toDate } = req.query;

    let query = `
      SELECT
        u.user_id as student_id,
        u.full_name as student_name,
        u.email,
        c.course_code,
        c.course_name,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage
      FROM users u
      CROSS JOIN courses c
      LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND c.id = ce.course_id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND cs.session_id = ar.session_id
      WHERE u.role = 'STUDENT' AND c.is_active = 1
    `;
    const params = [];

    if (courseId) {
      query += ` AND c.id = ?`;
      params.push(courseId);
    }

    if (studentId) {
      query += ` AND u.id = ?`;
      params.push(studentId);
    }

    if (fromDate) {
      query += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY u.id, c.id HAVING total_sessions > 0 ORDER BY c.course_code, u.full_name`;

    const result = await pool.query(query, params);
    const data = result.rows || [];

    const filename = `attendance_report_${Date.now()}.csv`;
    const exportResult = await exportToCSV(data, filename);

    if (exportResult.success) {
      res.download(exportResult.filepath, filename, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({ error: 'Failed to download file' });
        }
      });
    } else {
      res.status(500).json({ error: exportResult.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export attendance report as PDF
async function exportAttendancePDF(req, res) {
  try {
    const { courseId, studentId, fromDate, toDate } = req.query;

    let query = `
      SELECT
        u.user_id as student_id,
        u.full_name as student_name,
        u.email,
        c.course_code,
        c.course_name,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage
      FROM users u
      CROSS JOIN courses c
      LEFT JOIN course_enrollments ce ON u.id = ce.student_id AND c.id = ce.course_id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND cs.session_id = ar.session_id
      WHERE u.role = 'STUDENT' AND c.is_active = 1
    `;
    const params = [];

    if (courseId) {
      query += ` AND c.id = ?`;
      params.push(courseId);
    }

    if (studentId) {
      query += ` AND u.id = ?`;
      params.push(studentId);
    }

    if (fromDate) {
      query += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    query += ` GROUP BY u.id, c.id HAVING total_sessions > 0 ORDER BY c.course_code, u.full_name`;

    const result = await pool.query(query, params);
    const data = result.rows || [];

    const filename = `attendance_report_${Date.now()}.pdf`;
    const reportTitle = 'Attendance Report';
    const exportResult = await exportToPDF(data, filename, reportTitle);

    if (exportResult.success) {
      res.download(exportResult.filepath, filename, (err) => {
        if (err) {
          console.error('Error downloading file:', err);
          res.status(500).json({ error: 'Failed to download file' });
        }
      });
    } else {
      res.status(500).json({ error: exportResult.error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Export session attendance
async function exportSessionAttendance(req, res) {
  try {
    const { sessionId } = req.params;
    const { format = 'csv' } = req.query;

    const query = `
      SELECT
        u.user_id as student_id,
        u.full_name as student_name,
        u.email,
        ar.scan_time,
        ar.attendance_status,
        ar.gps_latitude,
        ar.gps_longitude,
        ar.is_within_geofence
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      WHERE ar.session_id = ?
      ORDER BY ar.scan_time
    `;

    const result = await pool.query(query, [sessionId]);
    const data = result.rows || [];

    const filename = `session_${sessionId}_${Date.now()}.${format}`;

    if (format === 'csv') {
      const exportResult = await exportSessionAttendanceCSV(data, filename);
      if (exportResult.success) {
        res.download(exportResult.filepath, filename);
      } else {
        res.status(500).json({ error: exportResult.error });
      }
    } else {
      res.status(400).json({ error: 'Unsupported format. Use csv.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  exportAttendanceCSV,
  exportAttendancePDF,
  exportSessionAttendance,
};
