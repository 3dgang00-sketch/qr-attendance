/**
 * Student Dashboard
 * View personal attendance, enrolled courses, and attendance trends
 */

import React, { useState, useEffect } from 'react';
import { attendanceAPI, adminAPI } from '../utils/apiService';
import { useApp } from '../context/AppContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#f5f5f5',
    minHeight: '100vh',
  },
  header: {
    backgroundColor: '#0066cc',
    color: 'white',
    padding: '20px',
    borderRadius: '5px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
  },
  logoutBtn: {
    backgroundColor: '#ff5252',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#333',
  },
  metricCard: {
    textAlign: 'center',
    padding: '20px',
  },
  metricValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#0066cc',
    margin: '10px 0',
  },
  metricLabel: {
    fontSize: '14px',
    color: '#666',
  },
  courseList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  courseItem: {
    padding: '15px',
    backgroundColor: '#f9f9f9',
    marginBottom: '10px',
    borderRadius: '4px',
    borderLeft: '4px solid #0066cc',
  },
  courseCode: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#0066cc',
    margin: '0 0 5px 0',
  },
  courseName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 10px 0',
  },
  progressBar: {
    height: '20px',
    backgroundColor: '#e0e0e0',
    borderRadius: '10px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  statsText: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
  attendanceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    padding: '10px',
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #ddd',
    fontSize: '13px',
  },
  tableRow: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '13px',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  badgePresent: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  badgeAbsent: {
    backgroundColor: '#ff5252',
    color: 'white',
  },
  badgeWarning: {
    backgroundColor: '#ff9800',
    color: 'white',
  },
  alertBox: {
    padding: '15px',
    backgroundColor: '#fff3cd',
    borderLeft: '4px solid #ff9800',
    borderRadius: '4px',
    marginBottom: '15px',
  },
  alertTitle: {
    fontWeight: 'bold',
    color: '#ff9800',
    marginBottom: '5px',
  },
  chartContainer: {
    width: '100%',
    height: '300px',
    marginTop: '15px',
  },
  emptyState: {
    textAlign: 'center',
    color: '#999',
    padding: '40px 20px',
  },
};

function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [overallStats, setOverallStats] = useState({
    totalSessions: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0,
  });
  const [trendData, setTrendData] = useState([]);
  const [lowAttendanceCourses, setLowAttendanceCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showError, showSuccess } = useApp();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStudentData();
  }, []);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // Load student's attendance history
      const historyResponse = await attendanceAPI.getStudentHistory(user.id, {
        limit: 100,
        offset: 0,
      });
      
      if (historyResponse.data.data) {
        setAttendanceHistory(historyResponse.data.data);
        
        // Calculate overall stats
        const total = historyResponse.data.data.length;
        const present = historyResponse.data.data.filter(r => r.attendance_status === 'PRESENT').length;
        const absent = total - present;
        const percentage = total > 0 ? ((present / total) * 100).toFixed(2) : 0;
        
        setOverallStats({
          totalSessions: total,
          presentCount: present,
          absentCount: absent,
          attendancePercentage: percentage,
        });
        
        // Generate trend data (last 10 sessions)
        const last10 = historyResponse.data.data.slice(0, 10).reverse();
        setTrendData(
          last10.map((record, idx) => ({
            session: `Session ${idx + 1}`,
            present: record.attendance_status === 'PRESENT' ? 1 : 0,
            date: new Date(record.scan_time).toLocaleDateString(),
          }))
        );
        
        // Calculate attendance by course
        const courseStats = {};
        historyResponse.data.data.forEach(record => {
          const courseKey = record.course_code || 'Unknown';
          if (!courseStats[courseKey]) {
            courseStats[courseKey] = {
              course_code: record.course_code,
              course_name: record.course_name,
              total: 0,
              present: 0,
            };
          }
          courseStats[courseKey].total += 1;
          if (record.attendance_status === 'PRESENT') {
            courseStats[courseKey].present += 1;
          }
        });
        
        const courseList = Object.values(courseStats).sort((a, b) => b.total - a.total);
        setCourses(courseList);
        
        // Identify low attendance courses (below 75%)
        const lowAttendance = courseList
          .map(c => ({
            ...c,
            percentage: ((c.present / c.total) * 100).toFixed(2),
          }))
          .filter(c => parseFloat(c.percentage) < 75);
        
        setLowAttendanceCourses(lowAttendance);
      }
    } catch (err) {
      showError('Failed to load attendance data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const downloadAttendanceReport = () => {
    // Generate CSV
    const headers = ['Course Code', 'Course Name', 'Lecturer', 'Date', 'Slot', 'Status', 'Location'];
    const rows = attendanceHistory.map(record => [
      record.course_code || 'N/A',
      record.course_name || 'N/A',
      record.lecturer_name || 'N/A',
      new Date(record.scan_time).toLocaleDateString(),
      `${record.start_time || 'N/A'} - ${record.end_time || 'N/A'}`,
      record.attendance_status,
      record.is_within_geofence ? 'Inside' : 'Outside',
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess('Report downloaded successfully!');
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return '#4caf50';
    if (percentage >= 75) return '#ff9800';
    return '#ff5252';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>📚 Student Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Welcome, {user.fullName}</p>
          <p style={{ margin: '4px 0 0 0', opacity: 0.9, fontSize: '13px' }}>
            Student ID: {user.userId || user.user_id || 'N/A'}
          </p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Overall Statistics */}
      <div style={styles.gridContainer}>
        <div style={styles.card}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Overall Attendance</div>
            <div
              style={{
                ...styles.metricValue,
                color: getAttendanceColor(parseFloat(overallStats.attendancePercentage)),
              }}
            >
              {overallStats.attendancePercentage}%
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Total Sessions</div>
            <div style={styles.metricValue}>{overallStats.totalSessions}</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Present</div>
            <div style={{ ...styles.metricValue, color: '#4caf50' }}>
              {overallStats.presentCount}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Absent</div>
            <div style={{ ...styles.metricValue, color: '#ff5252' }}>
              {overallStats.absentCount}
            </div>
          </div>
        </div>
      </div>

      {/* Low Attendance Alerts */}
      {lowAttendanceCourses.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>⚠️ Attendance Alerts</h2>
          {lowAttendanceCourses.map(course => (
            <div key={course.course_code} style={styles.alertBox}>
              <div style={styles.alertTitle}>
                {course.course_code}: {course.percentage}% Attendance
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                You have {course.total - course.present} absence(s) in{' '}
                {course.total} sessions. Please improve your attendance!
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Courses Grid */}
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={styles.cardTitle}>📊 My Courses</h2>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            onClick={downloadAttendanceReport}
          >
            📥 Download Report
          </button>
        </div>

        {courses.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No enrolled courses yet</p>
          </div>
        ) : (
          <div style={styles.gridContainer}>
            {courses.map(course => {
              const percentage = (course.present / course.total) * 100;
              return (
                <div key={course.course_code} style={styles.courseItem}>
                  <p style={styles.courseCode}>{course.course_code}</p>
                  <p style={styles.courseName}>{course.course_name}</p>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${percentage}%`,
                        backgroundColor: getAttendanceColor(percentage),
                      }}
                    >
                      {percentage.toFixed(0)}%
                    </div>
                  </div>
                  <p style={styles.statsText}>
                    {course.present} / {course.total} sessions attended
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance Trend */}
      {trendData.length > 0 && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📈 Recent Attendance Trend</h2>
          <div style={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="session" />
                <YAxis domain={[0, 1]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            backgroundColor: 'white',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '12px' }}>
                            {data.date}
                          </p>
                          <p style={{ margin: '5px 0 0 0', fontSize: '12px' }}>
                            {data.present ? '✓ Present' : '✗ Absent'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="present"
                  fill="#4caf50"
                  name="Present"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Attendance History */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📋 Recent Attendance History</h2>
        {attendanceHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No attendance records yet</p>
          </div>
        ) : (
          <table style={styles.attendanceTable}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={styles.tableHeader}>Course</th>
                <th style={styles.tableHeader}>Lecturer</th>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Slot</th>
                <th style={styles.tableHeader}>Status</th>
                <th style={styles.tableHeader}>Location</th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.slice(0, 20).map(record => (
                <tr key={record.id}>
                  <td style={styles.tableRow}>
                    <strong>{record.course_code}</strong>
                  </td>
                  <td style={styles.tableRow}>
                    {record.lecturer_name || 'N/A'}
                  </td>
                  <td style={styles.tableRow}>
                    {new Date(record.scan_time).toLocaleDateString()}
                  </td>
                  <td style={styles.tableRow}>
                    {record.start_time && record.end_time
                      ? `${record.start_time} - ${record.end_time}`
                      : new Date(record.scan_time).toLocaleTimeString()}
                  </td>
                  <td style={styles.tableRow}>
                    <span
                      style={{
                        ...styles.badge,
                        ...(record.attendance_status === 'PRESENT'
                          ? styles.badgePresent
                          : styles.badgeAbsent),
                      }}
                    >
                      {record.attendance_status}
                    </span>
                  </td>
                  <td style={styles.tableRow}>
                    {record.is_within_geofence ? (
                      <span style={{ ...styles.badge, ...styles.badgePresent }}>
                        ✓ Inside
                      </span>
                    ) : (
                      <span style={{ ...styles.badge, ...styles.badgeWarning }}>
                        ⚠ Outside
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {attendanceHistory.length > 20 && (
          <p style={{ marginTop: '15px', color: '#999', fontSize: '12px' }}>
            Showing 20 of {attendanceHistory.length} records
          </p>
        )}
      </div>
    </div>
  );
}

export default StudentDashboard;
