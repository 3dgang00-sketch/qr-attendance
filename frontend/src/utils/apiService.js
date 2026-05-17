import api from './api';

// Auth API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Register user function
export const registerUser = async (userData) => {
  try {
    const response = await authAPI.register(userData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

// Session API calls
export const sessionAPI = {
  createSession: (data) => api.post('/session/create', data),
  startSession: (sessionId, payload = {}) => api.post('/session/start', { sessionId, ...payload }),
  refreshQRCode: (sessionId) => api.post('/session/refresh-qr', { sessionId }),
  closeSession: (sessionId) => api.post('/session/close', { sessionId }),
  getSession: (sessionId) => api.get(`/session/${sessionId}`),
  getLecturerSessions: () => api.get('/session/lecturer/all'),
  getCoursesSessions: (courseId) => api.get(`/course/${courseId}/sessions`),
};

// Attendance API calls
export const attendanceAPI = {
  scanQRCode: (qrToken, gpsLatitude, gpsLongitude, deviceInfo) =>
    api.post('/attendance/scan', {
      qrToken,
      gpsLatitude,
      gpsLongitude,
      deviceInfo,
    }),
  getAttendanceRecord: (recordId) => api.get(`/attendance/record/${recordId}`),
  getSessionAttendance: (sessionId) => api.get(`/attendance/session/${sessionId}`),
  getStudentHistory: (studentId, query) =>
    api.get(`/attendance/student/${studentId}/history`, { params: query }),
};

// Admin API calls
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/stats'),
  getAllUsers: (query) => api.get('/admin/users', { params: query }),
  deactivateUser: (userId) => api.post('/admin/user/deactivate', { userId }),
  activateUser: (userId) => api.post('/admin/user/activate', { userId }),
  updateUser: (data) => api.put('/admin/user/update', data),
  resetUserPassword: (userId, newPassword) =>
    api.post('/admin/user/reset-password', { userId, newPassword }),
  deleteUser: (userId) => api.post('/admin/user/delete', { userId }),
  bulkCreateStudents: (csvText, defaultDepartment) =>
    api.post('/admin/users/bulk-create', { csvText, defaultDepartment }),
  createGeofenceZone: (data) => api.post('/admin/geofence/create', data),
  getGeofenceZones: () => api.get('/admin/geofence/zones'),
  updateGeofenceZone: (zoneId, data) => api.put(`/admin/geofence/${zoneId}`, data),
  deleteGeofenceZone: (zoneId) => api.delete(`/admin/geofence/${zoneId}`),
  getCourses: () => api.get('/admin/courses'),
  getLecturers: () => api.get('/admin/lecturers'),
  createCourse: (data) => api.post('/admin/course/create', data),
  enrollStudent: (studentId, courseId) =>
    api.post('/admin/enrollment', { studentId, courseId }),
  getAttendanceReport: (query) => api.get('/admin/report/attendance', { params: query }),
  listAttendanceRecords: (query) =>
    api.get('/admin/attendance/records', { params: query }),
  getScanAuditLog: (query) => api.get('/admin/audit/scans', { params: query }),
  overrideAttendance: (data) => api.post('/admin/attendance/override', data),
  getRegistrationRequests: () => api.get('/admin/registration-requests'),
  approveRegistration: (requestId) => api.post(`/admin/registration/${requestId}/approve`),
  rejectRegistration: (requestId, reason) => api.post(`/admin/registration/${requestId}/reject`, { reason }),
};
