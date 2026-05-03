const pool = require('../config/database');

// Get attendance analytics for a course
async function getCourseAnalytics(req, res) {
  try {
    const { courseId } = req.params;
    const { fromDate, toDate } = req.query;

    let dateFilter = '';
    const params = [courseId];

    if (fromDate) {
      dateFilter += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      dateFilter += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    // Overall statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        COUNT(ar.id) as total_attendance_records,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2) as overall_attendance_rate
      FROM courses c
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE c.id = ?${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Attendance trend by session
    const trendQuery = `
      SELECT
        cs.class_date,
        cs.session_id,
        COUNT(ar.id) as attendance_count,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE cs.course_id = ?${dateFilter}
      GROUP BY cs.id, cs.class_date, cs.session_id
      ORDER BY cs.class_date
    `;

    const trendResult = await pool.query(trendQuery, params);
    const trend = trendResult.rows;

    // Top performers
    const topPerformersQuery = `
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        COUNT(ar.id) as sessions_attended,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON ce.course_id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND cs.session_id = ar.session_id
      WHERE ce.course_id = ?
      GROUP BY u.id, u.user_id, u.full_name, u.email
      ORDER BY attendance_percentage DESC
      LIMIT 10
    `;

    const topPerformersResult = await pool.query(topPerformersQuery, params);
    const topPerformers = topPerformersResult.rows;

    // At-risk students (attendance < 75%)
    const atRiskQuery = `
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) as attended_sessions,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage
      FROM users u
      JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON ce.course_id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND cs.session_id = ar.session_id
      WHERE ce.course_id = ?
      GROUP BY u.id, u.user_id, u.full_name, u.email
      HAVING attendance_percentage < 75 OR attendance_percentage IS NULL
      ORDER BY attendance_percentage ASC
    `;

    const atRiskResult = await pool.query(atRiskQuery, params);
    const atRiskStudents = atRiskResult.rows;

    res.json({
      courseId,
      statistics: stats,
      attendanceTrend: trend,
      topPerformers,
      atRiskStudents,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get student analytics
async function getStudentAnalytics(req, res) {
  try {
    const { studentId } = req.params;
    const { fromDate, toDate } = req.query;

    let dateFilter = '';
    const params = [studentId];

    if (fromDate) {
      dateFilter += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      dateFilter += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    // Overall statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT ce.course_id) as enrolled_courses,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as overall_attendance_rate
      FROM users u
      LEFT JOIN course_enrollments ce ON u.id = ce.student_id
      LEFT JOIN class_sessions cs ON ce.course_id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN attendance_records ar ON u.id = ar.student_id AND cs.session_id = ar.session_id
      WHERE u.id = ?
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Course-wise breakdown
    const courseBreakdownQuery = `
      SELECT
        c.id as course_id,
        c.course_code,
        c.course_name,
        COUNT(DISTINCT cs.id) as total_sessions,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN ar.attendance_status = 'ABSENT' THEN 1 ELSE 0 END) as absent_count,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(DISTINCT cs.id), 0), 2) as attendance_percentage
      FROM course_enrollments ce
      JOIN courses c ON ce.course_id = c.id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN attendance_records ar ON ce.student_id = ar.student_id AND cs.session_id = ar.session_id
      WHERE ce.student_id = ?
      GROUP BY c.id, c.course_code, c.course_name
      ORDER BY c.course_code
    `;

    const courseBreakdownResult = await pool.query(courseBreakdownQuery, params);
    const courseBreakdown = courseBreakdownResult.rows;

    // Recent attendance history
    const recentHistoryQuery = `
      SELECT
        ar.scan_time,
        ar.attendance_status,
        c.course_code,
        c.course_name,
        cs.class_date,
        cs.room_location
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      JOIN courses c ON cs.course_id = c.id
      WHERE ar.student_id = ?${dateFilter.replace('cs.class_date', 'cs.class_date')}
      ORDER BY ar.scan_time DESC
      LIMIT 20
    `;

    const recentHistoryResult = await pool.query(recentHistoryQuery, params);
    const recentHistory = recentHistoryResult.rows;

    res.json({
      studentId,
      statistics: stats,
      courseBreakdown,
      recentHistory,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get lecturer analytics
async function getLecturerAnalytics(req, res) {
  try {
    const lecturerId = req.user.id;
    const { fromDate, toDate } = req.query;

    let dateFilter = '';
    const params = [lecturerId];

    if (fromDate) {
      dateFilter += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      dateFilter += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    // Overall statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT c.id) as total_courses,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT ce.student_id) as total_students,
        COUNT(ar.id) as total_attendance_records,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2) as overall_attendance_rate
      FROM courses c
      LEFT JOIN class_sessions cs ON c.id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE c.lecturer_id = ?
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Course-wise statistics
    const courseStatsQuery = `
      SELECT
        c.id,
        c.course_code,
        c.course_name,
        COUNT(DISTINCT cs.id) as sessions_conducted,
        COUNT(DISTINCT ce.student_id) as enrolled_students,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2) as attendance_rate
      FROM courses c
      LEFT JOIN class_sessions cs ON c.id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE c.lecturer_id = ?
      GROUP BY c.id, c.course_code, c.course_name
      ORDER BY c.course_code
    `;

    const courseStatsResult = await pool.query(courseStatsQuery, params);
    const courseStats = courseStatsResult.rows;

    res.json({
      lecturerId,
      statistics: stats,
      courseStatistics: courseStats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get system-wide analytics (Admin only)
async function getSystemAnalytics(req, res) {
  try {
    const { fromDate, toDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (fromDate) {
      dateFilter += ` AND cs.class_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      dateFilter += ` AND cs.class_date <= ?`;
      params.push(toDate);
    }

    // System-wide statistics
    const statsQuery = `
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT' AND is_active = 1) as active_students,
        (SELECT COUNT(*) FROM users WHERE role = 'LECTURER' AND is_active = 1) as active_lecturers,
        (SELECT COUNT(*) FROM courses WHERE is_active = 1) as active_courses,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(ar.id) as total_attendance_records,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2) as overall_attendance_rate
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE 1=1${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, params);
    const stats = statsResult.rows[0];

    // Department-wise breakdown
    const deptQuery = `
      SELECT
        c.department,
        COUNT(DISTINCT c.id) as courses,
        COUNT(DISTINCT cs.id) as sessions,
        COUNT(DISTINCT ce.student_id) as students,
        ROUND(100.0 * SUM(CASE WHEN ar.attendance_status IN ('PRESENT', 'LATE') THEN 1 ELSE 0 END) / NULLIF(COUNT(ar.id), 0), 2) as attendance_rate
      FROM courses c
      LEFT JOIN class_sessions cs ON c.id = cs.course_id${dateFilter.replace('cs.class_date', 'cs.class_date')}
      LEFT JOIN course_enrollments ce ON c.id = ce.course_id
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE c.is_active = 1
      GROUP BY c.department
      ORDER BY c.department
    `;

    const deptResult = await pool.query(deptQuery, params);
    const departmentStats = deptResult.rows;

    // Daily attendance trend (last 30 days)
    const trendQuery = `
      SELECT
        cs.class_date,
        COUNT(DISTINCT cs.id) as sessions,
        COUNT(ar.id) as total_scans,
        SUM(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN ar.attendance_status = 'LATE' THEN 1 ELSE 0 END) as late
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE cs.class_date >= date('now', '-30 days')
      GROUP BY cs.class_date
      ORDER BY cs.class_date DESC
      LIMIT 30
    `;

    const trendResult = await pool.query(trendQuery);
    const dailyTrend = trendResult.rows;

    res.json({
      systemStatistics: stats,
      departmentStatistics: departmentStats,
      dailyTrend,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getCourseAnalytics,
  getStudentAnalytics,
  getLecturerAnalytics,
  getSystemAnalytics,
};
