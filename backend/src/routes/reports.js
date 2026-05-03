/**
 * Reports and Analytics Routes
 * Handles report generation, exports, and analytics
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const asyncHandler = require('../middleware/asyncHandler');
const pool = require('../config/database');
const { exportToCSV, exportToPDF, exportToExcel } = require('../utils/reportExport');

const router = express.Router();

/**
 * Get attendance report with filtering
 * GET /reports/get-attendance-report
 */
router.get('/get-attendance-report', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), asyncHandler(async (req, res) => {
  const { courseId, studentId, fromDate, toDate, limit = 100, offset = 0 } = req.query;
  
  let query = `
    SELECT 
      ar.id,
      ar.record_id,
      u.user_id,
      u.full_name,
      u.email,
      c.course_code,
      c.course_name,
      cs.class_date,
      cs.start_time,
      ar.scan_time,
      ar.attendance_status,
      ar.is_within_geofence,
      ar.gps_latitude,
      ar.gps_longitude
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    JOIN class_sessions cs ON ar.session_id = cs.session_id
    JOIN courses c ON cs.course_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (courseId) {
    query += ' AND cs.course_id = ?';
    params.push(courseId);
  }
  
  if (studentId) {
    query += ' AND ar.student_id = ?';
    params.push(studentId);
  }
  
  if (fromDate) {
    query += ' AND DATE(ar.scan_time) >= ?';
    params.push(fromDate);
  }
  
  if (toDate) {
    query += ' AND DATE(ar.scan_time) <= ?';
    params.push(toDate);
  }
  
  // Only lecturers can see their own course data
  if (req.user.role === 'LECTURER') {
    query += ' AND cs.lecturer_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY ar.scan_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  const result = await pool.query(query, params);
  
  res.json({
    data: result.rows || [],
    count: (result.rows || []).length,
  });
}));

/**
 * Export attendance as CSV
 * GET /reports/export-csv
 */
router.get('/export-csv', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), asyncHandler(async (req, res) => {
  const { courseId, fromDate, toDate } = req.query;
  
  let query = `
    SELECT 
      u.full_name,
      u.email,
      c.course_code,
      c.course_name,
      cs.class_date,
      cs.start_time,
      ar.scan_time,
      ar.attendance_status,
      ar.is_within_geofence
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    JOIN class_sessions cs ON ar.session_id = cs.session_id
    JOIN courses c ON cs.course_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (courseId) {
    query += ' AND cs.course_id = ?';
    params.push(courseId);
  }
  
  if (fromDate) {
    query += ' AND DATE(ar.scan_time) >= ?';
    params.push(fromDate);
  }
  
  if (toDate) {
    query += ' AND DATE(ar.scan_time) <= ?';
    params.push(toDate);
  }
  
  // Only lecturers can see their own course data
  if (req.user.role === 'LECTURER') {
    query += ' AND cs.lecturer_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY ar.scan_time DESC';
  
  const result = await pool.query(query, params);
  const data = result.rows || [];
  
  if (data.length === 0) {
    return res.status(400).json({ error: 'No records found for export' });
  }
  
  try {
    const csv = exportToCSV(data, {
      columns: ['full_name', 'email', 'course_code', 'course_name', 'class_date', 'scan_time', 'attendance_status'],
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate CSV: ' + err.message });
  }
}));

/**
 * Export attendance as PDF
 * GET /reports/export-pdf
 */
router.get('/export-pdf', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), asyncHandler(async (req, res) => {
  const { courseId, fromDate, toDate } = req.query;
  
  let query = `
    SELECT 
      u.full_name,
      u.email,
      c.course_code,
      c.course_name,
      cs.class_date,
      cs.start_time,
      ar.scan_time,
      ar.attendance_status,
      ar.is_within_geofence
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    JOIN class_sessions cs ON ar.session_id = cs.session_id
    JOIN courses c ON cs.course_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (courseId) {
    query += ' AND cs.course_id = ?';
    params.push(courseId);
  }
  
  if (fromDate) {
    query += ' AND DATE(ar.scan_time) >= ?';
    params.push(fromDate);
  }
  
  if (toDate) {
    query += ' AND DATE(ar.scan_time) <= ?';
    params.push(toDate);
  }
  
  // Only lecturers can see their own course data
  if (req.user.role === 'LECTURER') {
    query += ' AND cs.lecturer_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY ar.scan_time DESC';
  
  const result = await pool.query(query, params);
  const data = result.rows || [];
  
  if (data.length === 0) {
    return res.status(400).json({ error: 'No records found for export' });
  }
  
  try {
    const pdf = await exportToPDF(data, {
      title: 'Attendance Report',
      columns: ['full_name', 'email', 'course_code', 'attendance_status', 'scan_time'],
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF: ' + err.message });
  }
}));

/**
 * Export attendance as Excel
 * GET /reports/export-excel
 */
router.get('/export-excel', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), asyncHandler(async (req, res) => {
  const { courseId, fromDate, toDate } = req.query;
  
  let query = `
    SELECT 
      u.full_name,
      u.email,
      c.course_code,
      c.course_name,
      cs.class_date,
      cs.start_time,
      ar.scan_time,
      ar.attendance_status,
      ar.is_within_geofence
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    JOIN class_sessions cs ON ar.session_id = cs.session_id
    JOIN courses c ON cs.course_id = c.id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (courseId) {
    query += ' AND cs.course_id = ?';
    params.push(courseId);
  }
  
  if (fromDate) {
    query += ' AND DATE(ar.scan_time) >= ?';
    params.push(fromDate);
  }
  
  if (toDate) {
    query += ' AND DATE(ar.scan_time) <= ?';
    params.push(toDate);
  }
  
  // Only lecturers can see their own course data
  if (req.user.role === 'LECTURER') {
    query += ' AND cs.lecturer_id = ?';
    params.push(req.user.id);
  }
  
  query += ' ORDER BY ar.scan_time DESC';
  
  const result = await pool.query(query, params);
  const data = result.rows || [];
  
  if (data.length === 0) {
    return res.status(400).json({ error: 'No records found for export' });
  }
  
  try {
    const xlsx = await exportToExcel(data, {
      sheetName: 'Attendance',
      columns: ['full_name', 'email', 'course_code', 'course_name', 'class_date', 'scan_time', 'attendance_status'],
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(xlsx);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Excel: ' + err.message });
  }
}));

/**
 * Get analytics for a course
 * GET /reports/analytics/:courseId
 */
router.get('/analytics/:courseId', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  
  // Only lecturers can see their own course analytics
  if (req.user.role === 'LECTURER') {
    const courseCheck = await pool.query(
      'SELECT * FROM courses WHERE id = ? AND lecturer_id = ?',
      [courseId, req.user.id]
    );
    
    if (!courseCheck.rows || courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized to view this course analytics' });
    }
  }
  
  // Get course info
  const courseInfo = await pool.query(
    'SELECT * FROM courses WHERE id = ?',
    [courseId]
  );
  
  // Get total sessions
  const sessionsQuery = await pool.query(
    'SELECT COUNT(*) as total FROM class_sessions WHERE course_id = ?',
    [courseId]
  );
  
  // Get attendance summary
  const attendanceQuery = await pool.query(`
    SELECT 
      u.full_name,
      COUNT(*) as total_sessions,
      SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
      ROUND(SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as attendance_percentage
    FROM attendance_records ar
    JOIN users u ON ar.student_id = u.id
    JOIN class_sessions cs ON ar.session_id = cs.session_id
    WHERE cs.course_id = ?
    GROUP BY u.id, u.full_name
    ORDER BY attendance_percentage DESC
  `, [courseId]);
  
  res.json({
    course: courseInfo.rows?.[0] || {},
    totalSessions: sessionsQuery.rows?.[0]?.total || 0,
    studentStats: attendanceQuery.rows || [],
  });
}));

module.exports = router;
