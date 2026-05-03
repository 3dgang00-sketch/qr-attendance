/**
 * Enhanced Lecturer Dashboard
 * Manage sessions, generate QR codes, view attendance
 */

import React, { useState, useEffect } from 'react';
import { sessionAPI, attendanceAPI } from '../utils/apiService';
import { useApp } from '../context/AppContext';

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
    gridTemplateColumns: '1fr 1fr',
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
  sessionList: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  sessionItem: {
    padding: '12px',
    backgroundColor: '#f9f9f9',
    marginBottom: '8px',
    borderRadius: '4px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.3s',
  },
  sessionItemActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#0066cc',
  },
  qrContainer: {
    textAlign: 'center',
    padding: '20px',
  },
  qrImage: {
    border: '2px solid #0066cc',
    padding: '10px',
    borderRadius: '8px',
    marginBottom: '15px',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
    marginBottom: '10px',
    fontSize: '14px',
  },
  buttonDanger: {
    backgroundColor: '#ff5252',
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
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
  },
  tableRow: {
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  qrToken: {
    backgroundColor: '#f5f5f5',
    padding: '10px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    wordBreak: 'break-all',
    marginTop: '10px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  statusActive: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  statusInactive: {
    backgroundColor: '#ccc',
    color: '#666',
  },
};

function LecturerDashboard() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode, setQrCode] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);
  const [qrExpiry, setQrExpiry] = useState(null);
  const { showSuccess, showError } = useApp();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadSessions();
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionAPI.getLecturerSessions();
      setSessions(response.data.data || []);
    } catch (err) {
      showError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (session) => {
    try {
      setLoading(true);

      const inputDate = window.prompt(
        'Enter class date (YYYY-MM-DD)',
        session.class_date ? new Date(session.class_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      );
      if (!inputDate) {
        setLoading(false);
        return;
      }
      const inputStart = window.prompt(
        'Enter class start time (HH:MM)',
        (session.start_time || '09:00').slice(0, 5)
      );
      if (!inputStart) {
        setLoading(false);
        return;
      }
      const inputEnd = window.prompt(
        'Enter class end time (HH:MM)',
        (session.end_time || '10:00').slice(0, 5)
      );
      if (!inputEnd) {
        setLoading(false);
        return;
      }

      const response = await sessionAPI.startSession(session.session_id, {
        classDate: inputDate,
        startTime: inputStart,
        endTime: inputEnd,
      });
      
      setActiveSession({
        ...session,
        class_date: inputDate,
        start_time: inputStart,
        end_time: inputEnd,
      });
      setQrCode(response.data.qrImage);
      setQrToken(response.data.qrToken);
      setQrExpiry(new Date(response.data.expiresAt));
      
      showSuccess(`Session started for ${inputStart} - ${inputEnd}. QR code generated.`);

      // Auto-refresh QR code every 30 seconds
      if (refreshTimer) clearInterval(refreshTimer);
      const interval = setInterval(() => {
        refreshQRCode(session.session_id);
      }, 30000);
      setRefreshTimer(interval);
    } catch (err) {
      showError(`Failed to start session: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshQRCode = async (sessionId) => {
    try {
      const response = await sessionAPI.refreshQRCode(sessionId);
      setQrCode(response.data.qrImage);
      setQrToken(response.data.qrToken);
      setQrExpiry(new Date(response.data.expiresAt));
    } catch (err) {
      console.error('Failed to refresh QR code:', err);
    }
  };

  const handleViewAttendance = async (session) => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getSessionAttendance(session.session_id);
      setAttendanceList(response.data.data || []);
      showSuccess('Attendance loaded');
    } catch (err) {
      showError('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async (session) => {
    try {
      setLoading(true);
      await sessionAPI.closeSession(session.session_id);
      setActiveSession(null);
      setQrCode('');
      setQrToken('');
      if (refreshTimer) clearInterval(refreshTimer);
      showSuccess('Session closed successfully');
    } catch (err) {
      showError('Failed to close session');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSuccess('QR Token copied to clipboard!');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>👨‍🏫 Lecturer Dashboard</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>Welcome, {user.fullName}</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div style={styles.gridContainer}>
        {/* Sessions List */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📚 My Sessions</h2>
          <div style={styles.sessionList}>
            {sessions.length === 0 ? (
              <p style={{ color: '#999' }}>No sessions available</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.session_id}
                  style={{
                    ...styles.sessionItem,
                    ...(activeSession?.session_id === session.session_id ? styles.sessionItemActive : {}),
                  }}
                  onClick={() => setActiveSession(session)}
                >
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                    {session.course_code} - {session.course_name}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                    {new Date(session.class_date).toLocaleDateString()} • {session.start_time}
                  </p>
                  <button
                    style={styles.button}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartSession(session);
                    }}
                    disabled={loading || activeSession?.session_id === session.session_id}
                  >
                    {activeSession?.session_id === session.session_id ? '✓ Started' : 'Start Session'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* QR Code Display */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>🔐 QR Code Generator</h2>
          {activeSession ? (
            <div style={styles.qrContainer}>
              <div style={{ ...styles.statusBadge, ...styles.statusActive }}>
                ✓ Session Active
              </div>
              
              {qrCode && (
                <>
                  <div style={styles.qrImage}>
                    <img src={qrCode} alt="QR Code" style={{ maxWidth: '100%', maxHeight: '250px' }} />
                  </div>
                  
                  <div style={styles.qrToken}>
                    <strong>Token:</strong>
                    <div style={{ marginTop: '5px', wordBreak: 'break-all' }}>
                      {qrToken}
                    </div>
                    <button
                      style={{ ...styles.button, marginTop: '10px' }}
                      onClick={() => copyToClipboard(qrToken)}
                    >
                      📋 Copy Token
                    </button>
                  </div>

                  {qrExpiry && (
                    <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                      Expires: {qrExpiry.toLocaleTimeString()}
                    </p>
                  )}

                  <div>
                    <button
                      style={{ ...styles.button, ...styles.buttonSuccess }}
                      onClick={() => refreshQRCode(activeSession.session_id)}
                      disabled={loading}
                    >
                      🔄 Refresh QR
                    </button>
                    <button
                      style={{ ...styles.button, ...styles.buttonDanger }}
                      onClick={() => handleCloseSession(activeSession)}
                      disabled={loading}
                    >
                      ✕ Close Session
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '40px 0' }}>
              Select and start a session to generate QR code
            </p>
          )}
        </div>
      </div>

      {/* Attendance List */}
      {activeSession && (
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={styles.cardTitle}>✓ Attendance - {activeSession.course_code}</h2>
            <button
              style={styles.button}
              onClick={() => handleViewAttendance(activeSession)}
              disabled={loading}
            >
              🔄 Refresh List
            </button>
          </div>

          {attendanceList.length > 0 ? (
            <table style={styles.attendanceTable}>
              <thead>
                <tr style={{ backgroundColor: '#f0f0f0' }}>
                  <th style={styles.tableHeader}>Student Name</th>
                  <th style={styles.tableHeader}>Email</th>
                  <th style={styles.tableHeader}>Scan Time</th>
                  <th style={styles.tableHeader}>Status</th>
                  <th style={styles.tableHeader}>Location</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map((record) => (
                  <tr key={record.id}>
                    <td style={styles.tableRow}>{record.full_name}</td>
                    <td style={styles.tableRow}>{record.email}</td>
                    <td style={styles.tableRow}>{new Date(record.scan_time).toLocaleTimeString()}</td>
                    <td style={styles.tableRow}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(record.attendance_status === 'PRESENT'
                            ? styles.statusActive
                            : styles.statusInactive),
                        }}
                      >
                        {record.attendance_status}
                      </span>
                    </td>
                    <td style={styles.tableRow}>
                      {record.is_within_geofence ? '✓ Inside' : '✕ Outside'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              No attendance records yet. Students will appear here as they scan the QR code.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default LecturerDashboard;
