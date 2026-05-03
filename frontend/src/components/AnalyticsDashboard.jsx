/**
 * Enhanced Analytics Dashboard
 * Shows attendance statistics, trends, and insights
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

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
  },
  title: {
    margin: '0 0 10px 0',
    fontSize: '28px',
  },
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
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
    fontSize: '14px',
    color: '#666',
    margin: '0 0 10px 0',
    fontWeight: 'bold',
  },
  cardValue: {
    fontSize: '32px',
    color: '#0066cc',
    margin: '0',
    fontWeight: 'bold',
  },
  cardSubtext: {
    fontSize: '12px',
    color: '#999',
    marginTop: '5px',
  },
  statGood: { color: '#4caf50' },
  statWarning: { color: '#ff9800' },
  statDanger: { color: '#f44336' },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    padding: '12px',
    textAlign: 'left',
    borderBottom: '2px solid #ddd',
  },
  tableRow: {
    padding: '12px',
    borderBottom: '1px solid #eee',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '15px',
    borderRadius: '5px',
    marginBottom: '20px',
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
  },
};

function AnalyticsDashboard({ courseId }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [lowAttendance, setLowAttendance] = useState([]);
  const [classWise, setClassWise] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load metrics
      const metricsRes = await api.get('/analytics/dashboard', {
        params: { courseId },
      });
      setMetrics(metricsRes.data.data);

      // Load trends
      const trendsRes = await api.get(`/analytics/trends/${courseId}`, {
        params: { days: 30 },
      });
      setTrends(trendsRes.data.data);

      // Load low attendance students (only for admin/lecturer)
      if (['SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'].includes(user.role)) {
        const lowRes = await api.get(`/analytics/low-attendance/${courseId}`, {
          params: { threshold: 75 },
        });
        setLowAttendance(lowRes.data.data);
      }

      // Load class-wise attendance
      const classRes = await api.get(`/analytics/class-wise/${courseId}`);
      setClassWise(classRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.post('/reports/csv', { courseId }, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
    } catch (err) {
      setError('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.post('/reports/pdf', { courseId }, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentChild.removeChild(link);
    } catch (err) {
      setError('Failed to export PDF');
    }
  };

  if (loading) {
    return <div style={styles.loading}>Loading analytics...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Analytics & Reports</h1>
        <p>Course attendance insights and statistics</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Export Buttons */}
      <div style={{ marginBottom: '20px' }}>
        <button style={styles.button} onClick={handleExportCSV}>
          📥 Export CSV
        </button>
        <button style={styles.button} onClick={handleExportPDF}>
          📄 Export PDF
        </button>
      </div>

      {/* Overview Cards */}
      {metrics && (
        <div style={styles.gridContainer}>
          <div style={styles.card}>
            <p style={styles.cardTitle}>Total Students</p>
            <p style={styles.cardValue}>{metrics.totalStudents}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>Total Sessions</p>
            <p style={styles.cardValue}>{metrics.totalSessions}</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>Overall Attendance</p>
            <p style={{ ...styles.cardValue, ...styles.statGood }}>{metrics.overallAttendanceRate}%</p>
          </div>
          <div style={styles.card}>
            <p style={styles.cardTitle}>Present Count</p>
            <p style={styles.cardValue}>{metrics.totalPresent}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <button
          style={{
            ...styles.button,
            backgroundColor: activeTab === 'overview' ? '#0066cc' : '#ccc',
          }}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          style={{
            ...styles.button,
            backgroundColor: activeTab === 'class' ? '#0066cc' : '#ccc',
          }}
          onClick={() => setActiveTab('class')}
        >
          Class-wise
        </button>
        {['SUPER_ADMIN', 'DEPT_ADMIN', 'LECTURER'].includes(user.role) && (
          <button
            style={{
              ...styles.button,
              backgroundColor: activeTab === 'low' ? '#0066cc' : '#ccc',
            }}
            onClick={() => setActiveTab('low')}
          >
            Low Attendance
          </button>
        )}
      </div>

      {/* Class-wise Attendance Table */}
      {activeTab === 'class' && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={styles.tableHeader}>Date</th>
                <th style={styles.tableHeader}>Time</th>
                <th style={styles.tableHeader}>Present</th>
                <th style={styles.tableHeader}>Total</th>
                <th style={styles.tableHeader}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {classWise.map((cls, idx) => (
                <tr key={idx}>
                  <td style={styles.tableRow}>{new Date(cls.session_date).toLocaleDateString()}</td>
                  <td style={styles.tableRow}>{cls.start_time}</td>
                  <td style={styles.tableRow}>{cls.present}</td>
                  <td style={styles.tableRow}>{cls.total}</td>
                  <td style={styles.tableRow}>
                    <span style={cls.attendance_rate >= 75 ? styles.statGood : styles.statWarning}>
                      {cls.attendance_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Low Attendance Table */}
      {activeTab === 'low' && lowAttendance.length > 0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={styles.tableHeader}>Student Name</th>
                <th style={styles.tableHeader}>Email</th>
                <th style={styles.tableHeader}>Present</th>
                <th style={styles.tableHeader}>Total</th>
                <th style={styles.tableHeader}>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              {lowAttendance.map((student, idx) => (
                <tr key={idx}>
                  <td style={styles.tableRow}>{student.full_name}</td>
                  <td style={styles.tableRow}>{student.email}</td>
                  <td style={styles.tableRow}>{student.present_count}</td>
                  <td style={styles.tableRow}>{student.total_count}</td>
                  <td style={styles.tableRow}>
                    <span style={styles.statDanger}>{student.attendance_rate}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
