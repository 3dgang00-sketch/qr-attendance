const pool = require('../config/database');
const bcrypt = require('bcryptjs');

function adminDepartmentScope(req) {
  if (req.user.role === 'DEPT_ADMIN' && req.user.department) {
    return req.user.department;
  }
  return null;
}

// Get all users with pagination
async function getAllUsers(req, res) {
  try {
    const { role, department, search, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, user_id, email, full_name, role, department, is_active, last_login, created_at FROM users WHERE 1=1';
    const params = [];

    const scopedDept = adminDepartmentScope(req);
    if (scopedDept) {
      query += ` AND department = ?`;
      params.push(scopedDept);
    }

    if (role) {
      query += ` AND role = ?`;
      params.push(role);
    }

    if (department && !scopedDept) {
      query += ` AND department = ?`;
      params.push(department);
    }

    if (search) {
      query += ` AND (email LIKE ? OR full_name LIKE ? OR user_id LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Deactivate user account
async function deactivateUser(req, res) {
  try {
    const { userId } = req.body;
    const target = await pool.query('SELECT id, department, role FROM users WHERE id = ?', [userId]);
    if (!target.rows || target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const scoped = adminDepartmentScope(req);
    if (scoped && target.rows[0].department !== scoped) {
      return res.status(403).json({ error: 'Cannot modify users outside your department' });
    }
    if (['SUPER_ADMIN', 'DEPT_ADMIN'].includes(target.rows[0].role)) {
      return res.status(403).json({ error: 'Cannot deactivate administrator accounts from this action' });
    }

    const result = await pool.query(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    if (!result || !result.changes) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User account deactivated',
      user: { userId, is_active: false },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Reactivate user account
async function activateUser(req, res) {
  try {
    const { userId } = req.body;
    const target = await pool.query('SELECT id, department FROM users WHERE id = ?', [userId]);
    if (!target.rows || target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const scoped = adminDepartmentScope(req);
    if (scoped && target.rows[0].department !== scoped) {
      return res.status(403).json({ error: 'Cannot modify users outside your department' });
    }

    const result = await pool.query(
      'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );

    if (!result || !result.changes) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User account activated',
      user: { userId, is_active: true },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update user profile/admin fields
async function updateUser(req, res) {
  try {
    const { userId, fullName, email, department, role } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const target = await pool.query('SELECT id, role, department FROM users WHERE id = ?', [userId]);
    if (!target.rows || target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const scoped = adminDepartmentScope(req);
    if (scoped && target.rows[0].department !== scoped) {
      return res.status(403).json({ error: 'Cannot modify users outside your department' });
    }

    if (role && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can change user roles' });
    }

    if (role && ['SUPER_ADMIN', 'DEPT_ADMIN'].includes(target.rows[0].role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can modify admin accounts' });
    }

    const updates = [];
    const values = [];

    if (fullName !== undefined) {
      updates.push('full_name = ?');
      values.push(String(fullName).trim());
    }
    if (email !== undefined) {
      updates.push('email = ?');
      values.push(String(email).trim().toLowerCase());
    }
    if (department !== undefined) {
      const depValue = String(department || '').trim() || null;
      if (scoped && depValue !== scoped) {
        return res.status(403).json({ error: 'Department must remain within your scope' });
      }
      updates.push('department = ?');
      values.push(depValue);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      values.push(role);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const updated = await pool.query(
      'SELECT id, user_id, email, full_name, role, department, is_active, last_login, created_at FROM users WHERE id = ?',
      [userId]
    );
    return res.json({ message: 'User updated', user: updated.rows[0] });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'User ID or email already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
}

// Reset user password
async function resetUserPassword(req, res) {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ error: 'userId and newPassword are required' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const target = await pool.query('SELECT id, role, department FROM users WHERE id = ?', [userId]);
    if (!target.rows || target.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const scoped = adminDepartmentScope(req);
    if (scoped && target.rows[0].department !== scoped) {
      return res.status(403).json({ error: 'Cannot modify users outside your department' });
    }
    if (['SUPER_ADMIN', 'DEPT_ADMIN'].includes(target.rows[0].role) && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only super admin can reset admin passwords' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
    return res.json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

function parseCsvRows(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()));
  return { headers, rows };
}

// Bulk create students from CSV text
async function bulkCreateStudents(req, res) {
  try {
    const { csvText, defaultDepartment } = req.body;
    if (!csvText) {
      return res.status(400).json({ error: 'csvText is required' });
    }

    const { headers, rows } = parseCsvRows(csvText);
    if (!headers.length || !rows.length) {
      return res.status(400).json({ error: 'CSV must include a header and at least one row' });
    }

    const required = ['user_id', 'email', 'full_name', 'password'];
    const missing = required.filter((k) => !headers.includes(k));
    if (missing.length) {
      return res.status(400).json({ error: `Missing required CSV columns: ${missing.join(', ')}` });
    }

    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const scoped = adminDepartmentScope(req);
    const summary = { created: 0, skipped: 0, errors: [] };

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNo = i + 2;
      const userId = row[idx.user_id];
      const email = (row[idx.email] || '').toLowerCase();
      const fullName = row[idx.full_name];
      const password = row[idx.password];
      const department = row[idx.department] || defaultDepartment || scoped || null;

      if (!userId || !email || !fullName || !password) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNo}: required value missing`);
        continue;
      }
      if (String(password).length < 6) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNo}: password too short`);
        continue;
      }
      if (scoped && department !== scoped) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNo}: department out of scope`);
        continue;
      }

      try {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(
          'INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
          [userId, email, hash, fullName, 'STUDENT', department]
        );
        summary.created += 1;
      } catch (err) {
        summary.skipped += 1;
        summary.errors.push(`Row ${rowNo}: ${err.message.includes('UNIQUE') ? 'duplicate user_id/email' : err.message}`);
      }
    }

    return res.status(201).json({
      message: 'Bulk student import processed',
      ...summary,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Create or update geofence zone
async function createGeofenceZone(req, res) {
  try {
    const { zoneName, latitude, longitude, radiusMeters, buildingName, description } = req.body;

    if (!zoneName || latitude === undefined || longitude === undefined || !radiusMeters) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await pool.query(
      'INSERT INTO geofence_zones (zone_name, latitude, longitude, radius_meters, building_name, description) VALUES (?, ?, ?, ?, ?, ?)',
      [zoneName, latitude, longitude, radiusMeters, buildingName, description]
    );

    res.status(201).json({
      message: 'Geofence zone created',
      zone: { id: result.lastID, zone_name: zoneName, latitude, longitude, radius_meters: radiusMeters, building_name: buildingName, description },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all geofence zones
async function getGeofenceZones(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM geofence_zones WHERE is_active = 1 ORDER BY zone_name'
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update geofence zone
async function updateGeofenceZone(req, res) {
  try {
    const { zoneId } = req.params;
    const { latitude, longitude, radiusMeters, description } = req.body;

    const updateData = {
      latitude: latitude !== undefined ? latitude : null,
      longitude: longitude !== undefined ? longitude : null,
      radius_meters: radiusMeters !== undefined ? radiusMeters : null,
      description: description || null,
    };
    const updates = [];
    const values = [];
    for (const [key, val] of Object.entries(updateData)) {
      if (val !== null) {
        updates.push(`${key} = ?`);
        values.push(val);
      }
    }
    values.push(zoneId);
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const result = await pool.query(
      `UPDATE geofence_zones SET ${updates.join(', ')} WHERE id = ? AND is_active = 1`,
      values
    );

    if (!result || !result.changes) {
      return res.status(404).json({ error: 'Geofence zone not found' });
    }

    res.json({
      message: 'Geofence zone updated',
      zone: { id: zoneId, ...updateData },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Remove geofence zone (soft delete — no longer used for new validation)
async function deleteGeofenceZone(req, res) {
  try {
    const { zoneId } = req.params;
    const result = await pool.query(
      'UPDATE geofence_zones SET is_active = 0 WHERE id = ? AND is_active = 1',
      [zoneId]
    );

    if (!result || !result.changes) {
      return res.status(404).json({ error: 'Geofence zone not found or already removed' });
    }

    res.json({ message: 'Geofence zone removed', id: Number(zoneId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Create course
async function createCourse(req, res) {
  try {
    const { courseCode, courseName, department, lecturerId, credits, semester, academicYear } = req.body;

    if (!courseCode || !courseName || !department) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const scoped = adminDepartmentScope(req);
    if (scoped && department !== scoped) {
      return res.status(403).json({ error: 'Course must belong to your department' });
    }

    const result = await pool.query(
      'INSERT INTO courses (course_code, course_name, department, lecturer_id, credits, semester, academic_year) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [courseCode, courseName, department, lecturerId, credits, semester, academicYear]
    );

    res.status(201).json({
      message: 'Course created',
      course: { id: result.lastID, course_code: courseCode, course_name: courseName, department, lecturer_id: lecturerId, credits, semester, academic_year: academicYear },
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Course code already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Get attendance report
async function getAttendanceReport(req, res) {
  try {
    const { courseId, studentId, fromDate, toDate } = req.query;

    let query = `
      SELECT
        u.id, u.user_id, u.full_name, u.email,
        c.id as course_id, c.course_code, c.course_name,
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
      WHERE u.role = 'STUDENT' AND c.is_active = true
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

    query += ` GROUP BY u.id, c.id ORDER BY c.course_code, u.full_name`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Override attendance
async function overrideAttendance(req, res) {
  try {
    const { attendanceRecordId, overrideStatus, justification } = req.body;
    const adminId = req.user.id;

    if (!attendanceRecordId || !overrideStatus || !justification) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get original attendance record
    const recordResult = await pool.query(
      'SELECT * FROM attendance_records WHERE id = ?',
      [attendanceRecordId]
    );

    if (!recordResult.rows || recordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    const record = recordResult.rows[0];

    // Create override record
    const result = await pool.query(
      'INSERT INTO attendance_overrides (attendance_record_id, student_id, session_id, overridden_by, override_status, justification) VALUES (?, ?, ?, ?, ?, ?)',
      [attendanceRecordId, record.student_id, record.session_id, adminId, overrideStatus, justification]
    );

    // Update original attendance record
    await pool.query(
      'UPDATE attendance_records SET attendance_status = ? WHERE id = ?',
      [overrideStatus, attendanceRecordId]
    );

    res.status(201).json({
      message: 'Attendance overridden',
      override: { id: result.lastID, attendance_record_id: attendanceRecordId, override_status: overrideStatus },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Dashboard KPIs
async function getDashboardStats(req, res) {
  try {
    const dept = adminDepartmentScope(req);
    const uDept = dept ? ` AND department = ?` : '';
    const cDept = dept ? ` AND department = ?` : '';
    const p = dept ? [dept] : [];

    const [
      students,
      lecturers,
      courses,
      sessionsToday,
      scansToday,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS c FROM users WHERE role = 'STUDENT' AND is_active = 1${uDept}`, dept ? [dept] : []),
      pool.query(`SELECT COUNT(*) AS c FROM users WHERE role = 'LECTURER' AND is_active = 1${uDept}`, dept ? [dept] : []),
      pool.query(`SELECT COUNT(*) AS c FROM courses WHERE is_active = 1${cDept}`, dept ? [dept] : []),
      dept
        ? pool.query(
            `SELECT COUNT(*) AS c FROM class_sessions cs JOIN courses co ON cs.course_id = co.id WHERE cs.class_date = date('now') AND co.department = ?`,
            [dept]
          )
        : pool.query(`SELECT COUNT(*) AS c FROM class_sessions WHERE class_date = date('now')`),
      dept
        ? pool.query(
            `SELECT COUNT(*) AS c FROM scan_attempts_log sal JOIN users u ON sal.student_id = u.id WHERE date(sal.attempt_time) = date('now') AND u.department = ?`,
            [dept]
          )
        : pool.query(`SELECT COUNT(*) AS c FROM scan_attempts_log WHERE date(attempt_time) = date('now')`),
    ]);

    const pick = (r) => (r.rows && r.rows[0] ? Number(r.rows[0].c) : 0);

    res.json({
      activeStudents: pick(students),
      activeLecturers: pick(lecturers),
      activeCourses: pick(courses),
      sessionsToday: pick(sessionsToday),
      scanAttemptsToday: pick(scansToday),
      scope: dept ? 'department' : 'global',
      department: dept || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// List courses (with assigned lecturer)
async function getCourses(req, res) {
  try {
    const dept = adminDepartmentScope(req);
    let q = `SELECT c.*, u.full_name AS lecturer_name, u.email AS lecturer_email
      FROM courses c
      LEFT JOIN users u ON c.lecturer_id = u.id
      WHERE c.is_active = 1`;
    const params = [];
    if (dept) {
      q += ` AND c.department = ?`;
      params.push(dept);
    }
    q += ` ORDER BY c.course_code`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Lecturers for assigning to courses
async function getLecturers(req, res) {
  try {
    const dept = adminDepartmentScope(req);
    let q = `SELECT id, user_id, email, full_name, department FROM users WHERE role IN ('LECTURER', 'SUPER_ADMIN', 'DEPT_ADMIN') AND is_active = 1`;
    const params = [];
    if (dept) {
      q += ` AND department = ?`;
      params.push(dept);
    }
    q += ` ORDER BY full_name`;
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Enroll a student in a course
async function enrollStudent(req, res) {
  try {
    const { studentId, courseId } = req.body;
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'studentId and courseId are required' });
    }

    const stu = await pool.query('SELECT id, role, department FROM users WHERE id = ?', [studentId]);
    if (!stu.rows || stu.rows.length === 0 || stu.rows[0].role !== 'STUDENT') {
      return res.status(400).json({ error: 'Invalid student account' });
    }

    const crs = await pool.query('SELECT id, department FROM courses WHERE id = ? AND is_active = 1', [courseId]);
    if (!crs.rows || crs.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const scoped = adminDepartmentScope(req);
    if (scoped) {
      if (crs.rows[0].department !== scoped || stu.rows[0].department !== scoped) {
        return res.status(403).json({ error: 'Student and course must belong to your department' });
      }
    }

    const ins = await pool.query(
      'INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
      [studentId, courseId]
    );

    res.status(201).json({
      message: 'Student enrolled in course',
      enrollmentId: ins.lastID,
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Student is already enrolled in this course' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Attendance rows for overrides / review
async function listAttendanceRecords(req, res) {
  try {
    const { limit = 50, offset = 0, search, courseId, fromDate, toDate } = req.query;
    let q = `
      SELECT ar.id, ar.session_id, ar.attendance_status, ar.scan_time,
        u.id AS student_id, u.full_name AS student_name, u.email AS student_email, u.user_id AS student_user_id,
        c.id AS course_id, c.course_code, c.course_name
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN class_sessions cs ON ar.session_id = cs.session_id
      JOIN courses c ON cs.course_id = c.id
      WHERE 1=1`;
    const params = [];
    const scoped = adminDepartmentScope(req);
    if (scoped) {
      q += ` AND c.department = ?`;
      params.push(scoped);
    }
    if (courseId) {
      q += ` AND c.id = ?`;
      params.push(courseId);
    }
    if (fromDate) {
      q += ` AND date(ar.scan_time) >= date(?)`;
      params.push(fromDate);
    }
    if (toDate) {
      q += ` AND date(ar.scan_time) <= date(?)`;
      params.push(toDate);
    }
    if (search) {
      q += ` AND (u.email LIKE ? OR u.full_name LIKE ? OR u.user_id LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    q += ` ORDER BY ar.scan_time DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Recent QR scan audit (success + failures)
async function getScanAuditLog(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 250);
    const scoped = adminDepartmentScope(req);
    let q = `
      SELECT sal.id, sal.attempt_time, sal.scan_status, sal.error_message,
        sal.gps_latitude, sal.gps_longitude, sal.session_id,
        u.full_name AS student_name, u.email AS student_email, u.department AS student_department
      FROM scan_attempts_log sal
      LEFT JOIN users u ON sal.student_id = u.id
      WHERE 1=1`;
    const params = [];
    if (scoped) {
      q += ` AND (u.id IS NULL OR u.department = ?)`;
      params.push(scoped);
    }
    q += ` ORDER BY sal.attempt_time DESC LIMIT ?`;
    params.push(limit);
    const result = await pool.query(q, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getAllUsers,
  deactivateUser,
  activateUser,
  updateUser,
  resetUserPassword,
  bulkCreateStudents,
  createGeofenceZone,
  getGeofenceZones,
  updateGeofenceZone,
  deleteGeofenceZone,
  createCourse,
  getCourses,
  getLecturers,
  enrollStudent,
  getDashboardStats,
  getAttendanceReport,
  listAttendanceRecords,
  getScanAuditLog,
  overrideAttendance,
};
