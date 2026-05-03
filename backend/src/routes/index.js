const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { generalLimiter, loginLimiter, scanLimiter, attendanceLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');
const sessionController = require('../controllers/sessionController');
const attendanceController = require('../controllers/attendanceController');
const adminController = require('../controllers/adminController');
const reportsRouter = require('./reports');

const router = express.Router();

// ==================== Auth Routes ====================
router.post('/auth/register', generalLimiter, authController.register);
router.post('/auth/login', loginLimiter, authController.login);
router.get('/auth/profile', authenticateToken, authController.getProfile);
router.put('/auth/profile', authenticateToken, authController.updateProfile);

// ==================== Session Routes ====================
router.post('/session/create', authenticateToken, authorizeRole('LECTURER', 'SUPER_ADMIN'), sessionController.createSession);
router.post('/session/start', authenticateToken, authorizeRole('LECTURER', 'SUPER_ADMIN'), sessionController.startSession);
router.post('/session/refresh-qr', authenticateToken, authorizeRole('LECTURER', 'SUPER_ADMIN'), sessionController.refreshQRCode);
router.post('/session/close', authenticateToken, authorizeRole('LECTURER', 'SUPER_ADMIN'), sessionController.closeSession);
router.get('/session/:sessionId', authenticateToken, sessionController.getSession);
router.get('/session/lecturer/all', authenticateToken, authorizeRole('LECTURER', 'SUPER_ADMIN'), sessionController.getLecturerSessions);
router.get('/course/:courseId/sessions', authenticateToken, sessionController.getCourseSessions);

// ==================== Attendance Routes ====================
router.post('/attendance/scan', authenticateToken, authorizeRole('STUDENT'), scanLimiter, attendanceController.scanQRCode);
router.get('/attendance/record/:recordId', authenticateToken, attendanceController.getAttendanceRecord);
router.get('/attendance/session/:sessionId', authenticateToken, authorizeRole('LECTURER', 'DEPT_ADMIN', 'SUPER_ADMIN'), attendanceController.getSessionAttendance);
router.get('/attendance/student/:studentId/history', authenticateToken, attendanceController.getStudentAttendanceHistory);

// ==================== Admin Routes ====================
router.get('/admin/stats', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.getDashboardStats);
router.get('/admin/users', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.getAllUsers);
router.post('/admin/user/deactivate', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.deactivateUser);
router.post('/admin/user/activate', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.activateUser);
router.put('/admin/user/update', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.updateUser);
router.post('/admin/user/reset-password', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.resetUserPassword);
router.post('/admin/users/bulk-create', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.bulkCreateStudents);

// Geofence Routes
router.post('/admin/geofence/create', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.createGeofenceZone);
router.get('/admin/geofence/zones', authenticateToken, adminController.getGeofenceZones);
router.put('/admin/geofence/:zoneId', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.updateGeofenceZone);
router.delete('/admin/geofence/:zoneId', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.deleteGeofenceZone);

// Course & enrollment
router.get('/admin/courses', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.getCourses);
router.get('/admin/lecturers', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.getLecturers);
router.post('/admin/course/create', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.createCourse);
router.post('/admin/enrollment', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.enrollStudent);

// Reports & audit
router.get('/admin/report/attendance', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'), adminController.getAttendanceReport);
router.get('/admin/attendance/records', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.listAttendanceRecords);
router.get('/admin/audit/scans', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.getScanAuditLog);
router.post('/admin/attendance/override', authenticateToken, authorizeRole('SUPER_ADMIN', 'DEPT_ADMIN'), adminController.overrideAttendance);

// ==================== Reports and Analytics Routes ====================
router.use('/reports', reportsRouter);
router.use('/analytics', reportsRouter);

module.exports = router;
