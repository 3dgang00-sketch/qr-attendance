import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../utils/apiService';

const ADMIN_DUTIES = [
  'Manage user accounts (activate / deactivate students and lecturers in your scope)',
  'Create courses and assign lecturers; enroll students in courses',
  'Configure campus geofence zones used for GPS attendance checks',
  'Review attendance analytics and export-style reports',
  'Audit QR scan attempts (successes, geofence failures, expired tokens)',
  'Override attendance when justified (illness, system errors) with a written reason',
];

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [newStudent, setNewStudent] = useState({
    userId: '',
    fullName: '',
    email: '',
    password: '',
    department: '',
  });
  const [editUser, setEditUser] = useState(null);
  const [resetPasswordById, setResetPasswordById] = useState({});
  const [bulkCsv, setBulkCsv] = useState('user_id,email,full_name,password,department');
  const [newStudentErrors, setNewStudentErrors] = useState({});
  const [notice, setNotice] = useState({ type: '', text: '' });

  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [newCourse, setNewCourse] = useState({
    courseCode: '',
    courseName: '',
    department: '',
    lecturerId: '',
    credits: '',
    semester: '',
    academicYear: '',
  });
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollCourseId, setEnrollCourseId] = useState('');

  const [geofenceZones, setGeofenceZones] = useState([]);
  const [newZone, setNewZone] = useState({
    zoneName: '',
    latitude: '',
    longitude: '',
    radiusMeters: '',
    buildingName: '',
  });

  const [attendanceData, setAttendanceData] = useState([]);
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportCourseId, setReportCourseId] = useState('');

  const [auditLog, setAuditLog] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [recordSearch, setRecordSearch] = useState('');
  const [overrideForm, setOverrideForm] = useState({
    attendanceRecordId: '',
    overrideStatus: 'PRESENT',
    justification: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const loadStats = useCallback(async () => {
    const res = await adminAPI.getDashboardStats();
    setStats(res.data);
  }, []);

  const loadUsers = useCallback(async () => {
    const res = await adminAPI.getAllUsers({
      search: userSearch || undefined,
      role: userRoleFilter || undefined,
      limit: 100,
    });
    setUsers(res.data);
  }, [userSearch, userRoleFilter]);

  const loadCoursesAndLecturers = useCallback(async () => {
    const [cRes, lRes] = await Promise.all([adminAPI.getCourses(), adminAPI.getLecturers()]);
    setCourses(cRes.data);
    setLecturers(lRes.data);
  }, []);

  const loadGeofence = useCallback(async () => {
    const res = await adminAPI.getGeofenceZones();
    setGeofenceZones(res.data);
  }, []);

  const loadReports = useCallback(async () => {
    const res = await adminAPI.getAttendanceReport({
      fromDate: reportFrom || undefined,
      toDate: reportTo || undefined,
      courseId: reportCourseId || undefined,
    });
    setAttendanceData(res.data);
  }, [reportFrom, reportTo, reportCourseId]);

  const loadAudit = useCallback(async () => {
    const res = await adminAPI.getScanAuditLog({ limit: 120 });
    setAuditLog(res.data);
  }, []);

  const loadAttendanceRecords = useCallback(async () => {
    const res = await adminAPI.listAttendanceRecords({
      search: recordSearch || undefined,
      limit: 60,
    });
    setAttendanceRecords(res.data);
  }, [recordSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadStats();
        if (!cancelled) await loadGeofence();
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadStats, loadGeofence]);

  useEffect(() => {
    if (activeTab === 'users') {
      setLoading(true);
      loadUsers().catch(console.error).finally(() => setLoading(false));
    }
    if (activeTab === 'courses') {
      setLoading(true);
      loadCoursesAndLecturers().catch(console.error).finally(() => setLoading(false));
    }
    if (activeTab === 'geofence') {
      loadGeofence().catch(console.error);
    }
    if (activeTab === 'reports') {
      setLoading(true);
      loadCoursesAndLecturers()
        .then(() => loadReports())
        .catch(console.error)
        .finally(() => setLoading(false));
    }
    if (activeTab === 'audit') {
      setLoading(true);
      loadAudit().catch(console.error).finally(() => setLoading(false));
    }
    if (activeTab === 'overrides') {
      setLoading(true);
      loadCoursesAndLecturers()
        .then(() => loadAttendanceRecords())
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeTab, loadUsers, loadCoursesAndLecturers, loadGeofence, loadReports, loadAudit, loadAttendanceRecords]);

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user? They will not be able to sign in.')) return;
    try {
      await adminAPI.deactivateUser(id);
      await loadUsers();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCreateStudent = async () => {
    try {
      if (!validateNewStudent()) {
        return;
      }
      await adminAPI.bulkCreateStudents(
        `user_id,email,full_name,password,department\n${newStudent.userId},${newStudent.email},${newStudent.fullName},${newStudent.password},${newStudent.department || user.department || ''}`,
        newStudent.department || user.department || undefined
      );
      setNewStudent({
        userId: '',
        fullName: '',
        email: '',
        password: '',
        department: user.department || '',
      });
      setNewStudentErrors({});
      await loadUsers();
      await loadStats();
      showNotice('success', 'Student account created');
    } catch (err) {
      showNotice('error', err.response?.data?.error || err.message);
    }
  };

  const startEditUser = (u) => {
    setEditUser({
      id: u.id,
      fullName: u.full_name || '',
      email: u.email || '',
      department: u.department || '',
      role: u.role || 'STUDENT',
    });
  };

  const handleSaveUserEdit = async () => {
    try {
      await adminAPI.updateUser({
        userId: editUser.id,
        fullName: editUser.fullName,
        email: editUser.email,
        department: editUser.department,
        role: editUser.role,
      });
      setEditUser(null);
      await loadUsers();
      showNotice('success', 'User updated');
    } catch (err) {
      showNotice('error', err.response?.data?.error || err.message);
    }
  };

  const handleResetPassword = async (id) => {
    try {
      const nextPassword = resetPasswordById[id];
      if (!nextPassword || nextPassword.length < 6) {
        showNotice('error', 'Enter a password with at least 6 characters');
        return;
      }
      await adminAPI.resetUserPassword(id, nextPassword);
      setResetPasswordById((prev) => ({ ...prev, [id]: '' }));
      showNotice('success', 'Password reset successful');
    } catch (err) {
      showNotice('error', err.response?.data?.error || err.message);
    }
  };

  const handleBulkImport = async () => {
    try {
      const header = (bulkCsv.split(/\r?\n/).find(Boolean) || '').toLowerCase();
      if (!header.includes('user_id') || !header.includes('email') || !header.includes('full_name') || !header.includes('password')) {
        showNotice('error', 'CSV header must include: user_id,email,full_name,password,department');
        return;
      }
      await adminAPI.bulkCreateStudents(bulkCsv, user.department || undefined);
      await loadUsers();
      await loadStats();
      showNotice('success', 'Bulk import completed');
    } catch (err) {
      showNotice('error', err.response?.data?.error || err.message);
    }
  };

  const handleActivate = async (id) => {
    try {
      await adminAPI.activateUser(id);
      await loadUsers();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleCreateCourse = async () => {
    try {
      await adminAPI.createCourse({
        courseCode: newCourse.courseCode.trim(),
        courseName: newCourse.courseName.trim(),
        department: newCourse.department.trim(),
        lecturerId: newCourse.lecturerId ? parseInt(newCourse.lecturerId, 10) : null,
        credits: newCourse.credits ? parseInt(newCourse.credits, 10) : null,
        semester: newCourse.semester || null,
        academicYear: newCourse.academicYear || null,
      });
      setNewCourse({
        courseCode: '',
        courseName: '',
        department: user.department || '',
        lecturerId: '',
        credits: '',
        semester: '',
        academicYear: '',
      });
      await loadCoursesAndLecturers();
      await loadStats();
      alert('Course created');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleEnroll = async () => {
    try {
      await adminAPI.enrollStudent(
        parseInt(enrollStudentId, 10),
        parseInt(enrollCourseId, 10)
      );
      setEnrollStudentId('');
      setEnrollCourseId('');
      alert('Enrollment saved');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleAddGeofenceZone = async () => {
    try {
      await adminAPI.createGeofenceZone({
        zoneName: newZone.zoneName,
        latitude: parseFloat(newZone.latitude),
        longitude: parseFloat(newZone.longitude),
        radiusMeters: parseInt(newZone.radiusMeters, 10),
        buildingName: newZone.buildingName || undefined,
      });
      setNewZone({
        zoneName: '',
        latitude: '',
        longitude: '',
        radiusMeters: '',
        buildingName: '',
      });
      await loadGeofence();
      await loadStats();
      alert('Geofence zone created');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteGeofenceZone = async (zoneId, zoneName) => {
    const label = zoneName || `zone #${zoneId}`;
    if (!window.confirm(`Remove location "${label}"? It will no longer be used for QR attendance checks. Sessions that still reference it may fail until updated.`)) {
      return;
    }
    try {
      await adminAPI.deleteGeofenceZone(zoneId);
      await loadGeofence();
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleApplyReportFilters = async () => {
    setLoading(true);
    try {
      await loadReports();
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async () => {
    try {
      await adminAPI.overrideAttendance({
        attendanceRecordId: parseInt(overrideForm.attendanceRecordId, 10),
        overrideStatus: overrideForm.overrideStatus,
        justification: overrideForm.justification.trim(),
      });
      setOverrideForm({ attendanceRecordId: '', overrideStatus: 'PRESENT', justification: '' });
      await loadAttendanceRecords();
      alert('Attendance updated');
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const tabStyle = (id) => ({
    ...styles.tabBtn,
    backgroundColor: activeTab === id ? '#007bff' : '#ccc',
  });

  const showNotice = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice({ type: '', text: '' }), 3000);
  };

  const validateNewStudent = () => {
    const errors = {};
    if (!newStudent.userId.trim()) errors.userId = 'User ID is required';
    if (!newStudent.fullName.trim()) errors.fullName = 'Full name is required';
    if (!newStudent.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStudent.email.trim())) {
      errors.email = 'Enter a valid email';
    }
    if (!newStudent.password) {
      errors.password = 'Password is required';
    } else if (newStudent.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setNewStudentErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let out = '';
    for (let i = 0; i < 10; i += 1) out += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewStudent((prev) => ({ ...prev, password: out }));
    setNewStudentErrors((prev) => ({ ...prev, password: undefined }));
  };

  const downloadCsvTemplate = () => {
    const template = 'user_id,email,full_name,password,department\nSTU1001,student1@example.com,Student One,Pass@123,CSE';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>Administration</h1>
          <p style={styles.subtitle}>
            Department admins and super admins manage users, courses, geofences, and compliance here.
          </p>
        </div>
        <div style={styles.userInfo}>
          <span>{user.fullName} ({user.role})</span>
          <button type="button" onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.tabs}>
        {['overview', 'users', 'courses', 'geofence', 'reports', 'audit', 'overrides'].map((id) => (
          <button key={id} type="button" onClick={() => setActiveTab(id)} style={tabStyle(id)}>
            {id === 'overrides' ? 'Overrides' : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {notice.text && (
          <div style={notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}>
            {notice.text}
          </div>
        )}
        {loading && <p style={styles.hint}>Loading…</p>}

        {activeTab === 'overview' && (
          <div>
            <h2>What administrators do</h2>
            <ul style={styles.list}>
              {ADMIN_DUTIES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {stats && (
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <h3>Active students</h3>
                  <p style={styles.statValue}>{stats.activeStudents}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Active lecturers</h3>
                  <p style={styles.statValue}>{stats.activeLecturers}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Active courses</h3>
                  <p style={styles.statValue}>{stats.activeCourses}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Sessions today</h3>
                  <p style={styles.statValue}>{stats.sessionsToday}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Scan attempts today</h3>
                  <p style={styles.statValue}>{stats.scanAttemptsToday}</p>
                </div>
                <div style={styles.statCard}>
                  <h3>Scope</h3>
                  <p style={{ ...styles.statValue, fontSize: 18 }}>
                    {stats.scope === 'department' ? stats.department || 'Department' : 'Institution-wide'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2>User accounts</h2>
            <p style={styles.hint}>Search by name, email, or university ID. Deactivate accounts to block login; reactivate when appropriate.</p>
            <div style={styles.formSection}>
              <h3>Create student account</h3>
              <div style={styles.formGrid}>
                <input placeholder="User ID" value={newStudent.userId} onChange={(e) => setNewStudent({ ...newStudent, userId: e.target.value })} style={{ ...styles.input, ...(newStudentErrors.userId ? styles.inputError : {}) }} />
                <input placeholder="Full name" value={newStudent.fullName} onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })} style={{ ...styles.input, ...(newStudentErrors.fullName ? styles.inputError : {}) }} />
                <input placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} style={{ ...styles.input, ...(newStudentErrors.email ? styles.inputError : {}) }} />
                <input placeholder="Password" type="text" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} style={{ ...styles.input, ...(newStudentErrors.password ? styles.inputError : {}) }} />
                <input placeholder="Department" value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} style={styles.input} />
              </div>
              {(newStudentErrors.userId || newStudentErrors.fullName || newStudentErrors.email || newStudentErrors.password) && (
                <p style={styles.errorText}>
                  {newStudentErrors.userId || newStudentErrors.fullName || newStudentErrors.email || newStudentErrors.password}
                </p>
              )}
              <div style={styles.row}>
                <button type="button" onClick={handleCreateStudent} style={styles.submitBtn}>Create student</button>
                <button type="button" onClick={generatePassword} style={styles.secondaryBtn}>Auto-generate password</button>
              </div>
            </div>
            <div style={styles.formSection}>
              <h3>Bulk import students (CSV)</h3>
              <p style={styles.hint}>Columns: user_id,email,full_name,password,department</p>
              <textarea
                value={bulkCsv}
                onChange={(e) => setBulkCsv(e.target.value)}
                rows={6}
                style={{ ...styles.input, width: '100%', fontFamily: 'monospace' }}
              />
              <div style={styles.row}>
                <button type="button" onClick={handleBulkImport} style={styles.submitBtn}>Import CSV</button>
                <button type="button" onClick={downloadCsvTemplate} style={styles.secondaryBtn}>Download template</button>
              </div>
            </div>
            <div style={styles.row}>
              <input
                placeholder="Search…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={styles.input}
              />
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={styles.input}
              >
                <option value="">All roles</option>
                <option value="STUDENT">Student</option>
                <option value="LECTURER">Lecturer</option>
                <option value="DEPT_ADMIN">Dept admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
              </select>
              <button type="button" onClick={() => loadUsers()} style={styles.secondaryBtn}>Search</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Dept</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.user_id}</td>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.department || '—'}</td>
                    <td>{u.is_active ? 'Yes' : 'No'}</td>
                    <td>
                      <div style={styles.actionWrap}>
                        <button type="button" style={styles.secondaryBtn} onClick={() => startEditUser(u)}>Edit</button>
                        {['SUPER_ADMIN', 'DEPT_ADMIN'].includes(u.role) ? (
                          <span style={styles.muted}>—</span>
                        ) : u.is_active ? (
                          <button type="button" style={styles.dangerBtn} onClick={() => handleDeactivate(u.id)}>Deactivate</button>
                        ) : (
                          <button type="button" style={styles.okBtn} onClick={() => handleActivate(u.id)}>Activate</button>
                        )}
                        <input
                          type="password"
                          placeholder="New password"
                          value={resetPasswordById[u.id] || ''}
                          onChange={(e) => setResetPasswordById((prev) => ({ ...prev, [u.id]: e.target.value }))}
                          style={styles.input}
                        />
                        <button type="button" style={styles.submitBtn} onClick={() => handleResetPassword(u.id)}>Reset PW</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {editUser && (
              <div style={styles.formSection}>
                <h3>Edit user #{editUser.id}</h3>
                <div style={styles.formGrid}>
                  <input value={editUser.fullName} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} placeholder="Full name" style={styles.input} />
                  <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} placeholder="Email" style={styles.input} />
                  <input value={editUser.department} onChange={(e) => setEditUser({ ...editUser, department: e.target.value })} placeholder="Department" style={styles.input} />
                  <select value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} style={styles.input}>
                    <option value="STUDENT">Student</option>
                    <option value="LECTURER">Lecturer</option>
                    <option value="DEPT_ADMIN">Dept admin</option>
                    <option value="SUPER_ADMIN">Super admin</option>
                  </select>
                </div>
                <div style={styles.row}>
                  <button type="button" style={styles.submitBtn} onClick={handleSaveUserEdit}>Save changes</button>
                  <button type="button" style={styles.dangerBtn} onClick={() => setEditUser(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            <h2>Courses & enrollment</h2>
            <div style={styles.formSection}>
              <h3>Create course</h3>
              <div style={styles.formGrid}>
                <input placeholder="Course code" value={newCourse.courseCode} onChange={(e) => setNewCourse({ ...newCourse, courseCode: e.target.value })} style={styles.input} />
                <input placeholder="Course name" value={newCourse.courseName} onChange={(e) => setNewCourse({ ...newCourse, courseName: e.target.value })} style={styles.input} />
                <input placeholder="Department" value={newCourse.department} onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })} style={styles.input} />
                <select
                  value={newCourse.lecturerId}
                  onChange={(e) => setNewCourse({ ...newCourse, lecturerId: e.target.value })}
                  style={styles.input}
                >
                  <option value="">Assign lecturer (optional)</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>{l.full_name} — {l.email}</option>
                  ))}
                </select>
                <input placeholder="Credits" value={newCourse.credits} onChange={(e) => setNewCourse({ ...newCourse, credits: e.target.value })} style={styles.input} />
                <input placeholder="Semester" value={newCourse.semester} onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })} style={styles.input} />
                <input placeholder="Academic year" value={newCourse.academicYear} onChange={(e) => setNewCourse({ ...newCourse, academicYear: e.target.value })} style={styles.input} />
              </div>
              <button type="button" onClick={handleCreateCourse} style={styles.submitBtn}>Create course</button>
            </div>

            <div style={styles.formSection}>
              <h3>Enroll student</h3>
              <p style={styles.hint}>Use numeric IDs from the Users and Courses tables.</p>
              <div style={styles.row}>
                <input placeholder="Student ID (users.id)" value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} style={styles.input} />
                <input placeholder="Course ID (courses.id)" value={enrollCourseId} onChange={(e) => setEnrollCourseId(e.target.value)} style={styles.input} />
                <button type="button" onClick={handleEnroll} style={styles.submitBtn}>Enroll</button>
              </div>
            </div>

            <h3>Active courses</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Lecturer</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.course_code}</td>
                    <td>{c.course_name}</td>
                    <td>{c.department}</td>
                    <td>{c.lecturer_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'geofence' && (
          <div>
            <h2>Geofence zones</h2>
            <p style={styles.hint}>
              Define valid GPS areas for attendance. Students outside these radii may be rejected when scanning.
              Use Delete to remove a location from active use (it will disappear from this list and cannot validate new scans).
            </p>
            <div style={styles.formSection}>
              <h3>New zone</h3>
              <div style={styles.formGrid}>
                <input type="text" placeholder="Zone name" value={newZone.zoneName} onChange={(e) => setNewZone({ ...newZone, zoneName: e.target.value })} style={styles.input} />
                <input type="number" placeholder="Latitude" value={newZone.latitude} onChange={(e) => setNewZone({ ...newZone, latitude: e.target.value })} step="0.0001" style={styles.input} />
                <input type="number" placeholder="Longitude" value={newZone.longitude} onChange={(e) => setNewZone({ ...newZone, longitude: e.target.value })} step="0.0001" style={styles.input} />
                <input type="number" placeholder="Radius (m)" value={newZone.radiusMeters} onChange={(e) => setNewZone({ ...newZone, radiusMeters: e.target.value })} style={styles.input} />
                <input type="text" placeholder="Building" value={newZone.buildingName} onChange={(e) => setNewZone({ ...newZone, buildingName: e.target.value })} style={styles.input} />
              </div>
              <button type="button" onClick={handleAddGeofenceZone} style={styles.submitBtn}>Create zone</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Building</th>
                  <th>Lat</th>
                  <th>Lng</th>
                  <th>Radius (m)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {geofenceZones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.zone_name}</td>
                    <td>{zone.building_name}</td>
                    <td>{Number(zone.latitude).toFixed(6)}</td>
                    <td>{Number(zone.longitude).toFixed(6)}</td>
                    <td>{zone.radius_meters}</td>
                    <td>
                      <button
                        type="button"
                        style={styles.dangerBtn}
                        onClick={() => handleDeleteGeofenceZone(zone.id, zone.zone_name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2>Attendance analytics</h2>
            <div style={styles.row}>
              <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} style={styles.input} />
              <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} style={styles.input} />
              <select value={reportCourseId} onChange={(e) => setReportCourseId(e.target.value)} style={styles.input}>
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
                ))}
              </select>
              <button type="button" onClick={handleApplyReportFilters} style={styles.submitBtn}>Apply filters</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Sessions</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((record, idx) => (
                  <tr key={`${record.id}-${record.course_id}-${idx}`}>
                    <td>{record.full_name}</td>
                    <td>{record.course_code}</td>
                    <td>{record.total_sessions}</td>
                    <td>{record.present_count || 0}</td>
                    <td>{record.late_count || 0}</td>
                    <td>{record.absent_count || 0}</td>
                    <td>{record.attendance_percentage ?? 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
          <div>
            <h2>QR scan audit log</h2>
            <p style={styles.hint}>Recent attempts including failures (invalid token, outside geofence, rate limits).</p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Student</th>
                  <th>Session</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((row) => (
                  <tr key={row.id}>
                    <td>{row.attempt_time ? new Date(row.attempt_time).toLocaleString() : ''}</td>
                    <td>{row.scan_status}</td>
                    <td>{row.student_name || row.student_email || '—'}</td>
                    <td style={{ wordBreak: 'break-all' }}>{row.session_id || '—'}</td>
                    <td style={{ maxWidth: 280 }}>{row.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'overrides' && (
          <div>
            <h2>Manual attendance override</h2>
            <p style={styles.hint}>
              Use when a student was marked incorrectly. Pick the attendance record ID from the table, choose the corrected status, and document why.
            </p>
            <div style={styles.formSection}>
              <div style={styles.formGrid}>
                <input
                  placeholder="Attendance record ID"
                  value={overrideForm.attendanceRecordId}
                  onChange={(e) => setOverrideForm({ ...overrideForm, attendanceRecordId: e.target.value })}
                  style={styles.input}
                />
                <select
                  value={overrideForm.overrideStatus}
                  onChange={(e) => setOverrideForm({ ...overrideForm, overrideStatus: e.target.value })}
                  style={styles.input}
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="ABSENT">Absent</option>
                </select>
                <input
                  placeholder="Justification (required)"
                  value={overrideForm.justification}
                  onChange={(e) => setOverrideForm({ ...overrideForm, justification: e.target.value })}
                  style={{ ...styles.input, gridColumn: '1 / -1' }}
                />
              </div>
              <button type="button" onClick={handleOverride} style={styles.submitBtn}>Apply override</button>
            </div>
            <div style={styles.row}>
              <input
                placeholder="Filter by student name / email / ID"
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                style={styles.input}
              />
              <button type="button" onClick={() => loadAttendanceRecords()} style={styles.secondaryBtn}>Refresh list</button>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>When</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Status</th>
                  <th>Session</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.scan_time ? new Date(r.scan_time).toLocaleString() : ''}</td>
                    <td>{r.student_name}</td>
                    <td>{r.course_code}</td>
                    <td>{r.attendance_status}</td>
                    <td style={{ wordBreak: 'break-all', maxWidth: 160 }}>{r.session_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px',
    backgroundColor: '#007bff',
    color: 'white',
    gap: 16,
  },
  subtitle: {
    margin: '8px 0 0 0',
    opacity: 0.95,
    maxWidth: 640,
    fontSize: 14,
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexShrink: 0,
  },
  logoutBtn: {
    padding: '10px 15px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '16px',
    backgroundColor: 'white',
    borderBottom: '1px solid #ddd',
  },
  tabBtn: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'white',
  },
  content: {
    padding: '20px',
    maxWidth: '1280px',
    margin: '0 auto',
  },
  hint: {
    color: '#555',
    fontSize: 14,
    marginBottom: 12,
  },
  list: {
    lineHeight: 1.6,
    maxWidth: 900,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
  },
  statValue: {
    fontSize: 28,
    color: '#007bff',
    margin: '8px 0 0 0',
  },
  formSection: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px',
    marginTop: '10px',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    minWidth: 160,
  },
  submitBtn: {
    padding: '10px 24px',
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '10px 20px',
    backgroundColor: '#607d8b',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  dangerBtn: {
    padding: '6px 12px',
    backgroundColor: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 13,
  },
  okBtn: {
    padding: '6px 12px',
    backgroundColor: '#2e7d32',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: 13,
  },
  muted: {
    color: '#888',
    fontSize: 13,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '12px',
    backgroundColor: 'white',
    fontSize: 14,
  },
  actionWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  noticeSuccess: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 6,
    backgroundColor: '#e8f5e9',
    color: '#1b5e20',
    border: '1px solid #c8e6c9',
  },
  noticeError: {
    marginBottom: 12,
    padding: '10px 12px',
    borderRadius: 6,
    backgroundColor: '#ffebee',
    color: '#b71c1c',
    border: '1px solid #ffcdd2',
  },
  inputError: {
    border: '1px solid #e53935',
  },
  errorText: {
    color: '#b71c1c',
    margin: '8px 0',
    fontSize: 13,
  },
};

export default AdminDashboard;
