/**
 * Analytics and Statistics Service
 * Calculate attendance analytics and insights
 */

const pool = require('../config/database');

/**
 * Get attendance statistics for a student
 */
async function getStudentAttendanceStats(studentId, courseId = null) {
  try {
    let query = `
      SELECT 
        ar.attendance_status,
        COUNT(*) as count
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      WHERE ar.student_id = ?
    `;
    const params = [studentId];

    if (courseId) {
      query += ` AND cs.course_id = ?`;
      params.push(courseId);
    }

    query += ` GROUP BY ar.attendance_status`;

    const result = await pool.query(query, params);
    const records = result.rows || result;

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
      attendanceRate: 0,
    };

    for (const record of records) {
      stats[record.attendance_status?.toLowerCase()] = record.count;
      stats.total += record.count;
    }

    if (stats.total > 0) {
      stats.attendanceRate = ((stats.present / stats.total) * 100).toFixed(2);
    }

    return stats;
  } catch (err) {
    console.error('Error getting student stats:', err);
    throw err;
  }
}

/**
 * Get course attendance statistics
 */
async function getCourseAttendanceStats(courseId) {
  try {
    const query = `
      SELECT 
        ar.attendance_status,
        COUNT(*) as count,
        COUNT(DISTINCT ar.student_id) as unique_students
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      WHERE cs.course_id = ?
      GROUP BY ar.attendance_status
    `;

    const result = await pool.query(query, [courseId]);
    const records = result.rows || result;

    const stats = {
      present: 0,
      absent: 0,
      late: 0,
      total: 0,
      totalStudents: 0,
      attendanceRate: 0,
      averageAttendance: 0,
    };

    for (const record of records) {
      const status = record.attendance_status?.toLowerCase();
      stats[status] = record.count;
      stats.total += record.count;
      stats.totalStudents = Math.max(stats.totalStudents, record.unique_students);
    }

    if (stats.total > 0) {
      stats.attendanceRate = ((stats.present / stats.total) * 100).toFixed(2);
      stats.averageAttendance = (stats.attendanceRate / stats.totalStudents).toFixed(2);
    }

    return stats;
  } catch (err) {
    console.error('Error getting course stats:', err);
    throw err;
  }
}

/**
 * Get attendance trends (weekly/monthly)
 */
async function getAttendanceTrends(courseId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT 
        DATE(cs.class_date) as date,
        ar.attendance_status,
        COUNT(*) as count
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      WHERE cs.course_id = ? AND cs.class_date >= ?
      GROUP BY DATE(cs.class_date), ar.attendance_status
      ORDER BY date DESC
    `;

    const result = await pool.query(query, [courseId, startDate.toISOString().split('T')[0]]);
    const records = result.rows || result;

    const trends = {};
    for (const record of records) {
      const date = record.date;
      if (!trends[date]) {
        trends[date] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      trends[date][record.attendance_status?.toLowerCase()] = record.count;
      trends[date].total += record.count;
    }

    return trends;
  } catch (err) {
    console.error('Error getting attendance trends:', err);
    throw err;
  }
}

/**
 * Get students with low attendance
 */
async function getLowAttendanceStudents(courseId, threshold = 75) {
  try {
    const query = `
      SELECT 
        u.id,
        u.user_id,
        u.full_name,
        u.email,
        COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END) as present_count,
        COUNT(*) as total_count,
        ROUND((COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM users u
      JOIN attendance_records ar ON u.id = ar.student_id
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      WHERE cs.course_id = ?
      GROUP BY u.id, u.user_id, u.full_name, u.email
      HAVING attendance_rate < ?
      ORDER BY attendance_rate ASC
    `;

    const result = await pool.query(query, [courseId, threshold]);
    return result.rows || result;
  } catch (err) {
    console.error('Error getting low attendance students:', err);
    throw err;
  }
}

/**
 * Get geofence violation records
 */
async function getGeofenceViolations(courseId, limit = 20) {
  try {
    const query = `
      SELECT 
        ar.id,
        u.user_id,
        u.full_name,
        cs.course_id,
        c.course_code,
        ar.scan_time,
        ar.gps_latitude,
        ar.gps_longitude,
        ar.is_within_geofence,
        gz.zone_name,
        gz.latitude as zone_latitude,
        gz.longitude as zone_longitude
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      JOIN courses c ON cs.course_id = c.id
      JOIN geofence_zones gz ON cs.geofence_zone_id = gz.id
      WHERE cs.course_id = ? AND ar.is_within_geofence = 0
      ORDER BY ar.scan_time DESC
      LIMIT ?
    `;

    const result = await pool.query(query, [courseId, limit]);
    return result.rows || result;
  } catch (err) {
    console.error('Error getting geofence violations:', err);
    throw err;
  }
}

/**
 * Get class-wise attendance
 */
async function getClassWiseAttendance(courseId) {
  try {
    const query = `
      SELECT 
        cs.session_id,
        cs.class_date,
        cs.start_time,
        cs.end_time,
        COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END) as present,
        COUNT(*) as total,
        ROUND((COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END) * 100.0 / COUNT(*)), 2) as attendance_rate
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.session_id = ar.session_id
      WHERE cs.course_id = ?
      GROUP BY cs.session_id, cs.class_date, cs.start_time, cs.end_time
      ORDER BY cs.class_date DESC
    `;

    const result = await pool.query(query, [courseId]);
    return result.rows || result;
  } catch (err) {
    console.error('Error getting class-wise attendance:', err);
    throw err;
  }
}

/**
 * Get dashboard metrics
 */
async function getDashboardMetrics(courseId = null) {
  try {
    let query = `
      SELECT 
        COUNT(DISTINCT ar.student_id) as total_students,
        COUNT(CASE WHEN ar.attendance_status = 'PRESENT' THEN 1 END) as total_present,
        COUNT(*) as total_records,
        COUNT(DISTINCT cs.session_id) as total_sessions
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.session_id
    `;
    const params = [];

    if (courseId) {
      query += ` WHERE cs.course_id = ?`;
      params.push(courseId);
    }

    const result = await pool.query(query, params);
    const data = (result.rows || result)[0] || {};

    return {
      totalStudents: data.total_students || 0,
      totalPresent: data.total_present || 0,
      totalRecords: data.total_records || 0,
      totalSessions: data.total_sessions || 0,
      overallAttendanceRate:
        data.total_records > 0 ? ((data.total_present / data.total_records) * 100).toFixed(2) : 0,
    };
  } catch (err) {
    console.error('Error getting dashboard metrics:', err);
    throw err;
  }
}

module.exports = {
  getStudentAttendanceStats,
  getCourseAttendanceStats,
  getAttendanceTrends,
  getLowAttendanceStudents,
  getGeofenceViolations,
  getClassWiseAttendance,
  getDashboardMetrics,
};
