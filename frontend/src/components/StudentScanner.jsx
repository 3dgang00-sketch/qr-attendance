import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceAPI } from '../utils/apiService';
import { getCurrentLocation } from '../utils/locationUtils';
import { generateDeviceFingerprint } from '../utils/deviceUtils';

function StudentScanner() {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'manual'
  const [scanStatus, setScanStatus] = useState('ready'); // ready, scanning, success, error
  const [message, setMessage] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [confirmationData, setConfirmationData] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationGranted, setLocationGranted] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Load scan history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('scanHistory');
    if (saved) {
      setScanHistory(JSON.parse(saved));
    }
    loadAttendanceHistory();

    // Check camera permission
    navigator.permissions?.query({ name: 'camera' }).then(result => {
      setLocationGranted(result.state === 'granted');
    });
  }, []);

  const loadAttendanceHistory = async () => {
    try {
      if (!user?.id) return;
      const historyResponse = await attendanceAPI.getStudentHistory(user.id, {
        limit: 50,
        offset: 0,
      });
      const rows = historyResponse?.data?.data || historyResponse?.data || [];
      setAttendanceHistory(Array.isArray(rows) ? rows : []);
    } catch (err) {
      // Keep scanner usable even if history fetch fails
      console.error('Failed to load attendance history:', err);
    }
  };

  // Initialize camera scanner
  useEffect(() => {
    if (scanMode === 'camera' && scanStatus === 'ready' && !scannerInstanceRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
        scannerInstanceRef.current = null;
      }
    };
  }, [scanMode, scanStatus]);

  const initializeScanner = () => {
    if (!scannerRef.current) return;

    try {
      const scanner = new Html5QrcodeScanner(
        'qr-scanner',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          if (decodedText && scannerInstanceRef.current) {
            scanner.pause(true);
            handleCameraScan(decodedText);
          }
        },
        (error) => {
          if (error && error.includes('NotFoundException')) {
            // Not found error is normal during scanning
            return;
          }
        }
      );

      scannerInstanceRef.current = scanner;
      setCameraError(null);
    } catch (err) {
      setCameraError(
        err.message || 'Camera access denied or not available. Use manual entry mode.'
      );
      setScanMode('manual');
    }
  };

  const handleCameraScan = async (token) => {
    await handleScanQRCode(token);
  };

  const handleScanQRCode = async (token) => {
    if (scanStatus !== 'ready') return;

    setScanStatus('scanning');
    setMessage('Processing QR code...');

    try {
      // Get GPS location
      setLocationStatus('Getting GPS location...');
      const location = await getCurrentLocation();
      setLocationAccuracy(Math.round(location.accuracy));
      setLocationStatus(
        `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)} (Accuracy: ${Math.round(location.accuracy)}m)`
      );

      // Get device fingerprint
      const deviceInfo = generateDeviceFingerprint();

      // Send scan request to server
      setMessage('Verifying attendance...');
      const response = await attendanceAPI.scanQRCode(
        token,
        location.latitude,
        location.longitude,
        deviceInfo
      );

      // Add to scan history
      const newScan = {
        token: token.substring(0, 30) + '...',
        status: 'success',
        timestamp: new Date().toLocaleTimeString(),
        message: 'Attendance marked',
      };
      const updatedHistory = [newScan, ...scanHistory.slice(0, 4)];
      setScanHistory(updatedHistory);
      localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));

      // Show confirmation
      setConfirmationData({
        course: 'Class Session',
        time: new Date().toLocaleTimeString(),
        status: 'PRESENT',
      });

      setScanStatus('success');
      setMessage('✓ Attendance marked successfully!');
      setQrToken('');
      await loadAttendanceHistory();

      setTimeout(() => {
        setScanStatus('ready');
        setMessage('');
        setConfirmationData(null);
        if (scanMode === 'camera' && scannerInstanceRef.current) {
          scannerInstanceRef.current.resume();
        }
      }, 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setScanStatus('error');
      setMessage(`Error: ${errorMsg}`);

      // Add failed scan to history
      const failedScan = {
        token: token.substring(0, 30) + '...',
        status: 'error',
        timestamp: new Date().toLocaleTimeString(),
        message: errorMsg,
      };
      const updatedHistory = [failedScan, ...scanHistory.slice(0, 4)];
      setScanHistory(updatedHistory);
      localStorage.setItem('scanHistory', JSON.stringify(updatedHistory));

      setTimeout(() => {
        setScanStatus('ready');
        if (scanMode === 'camera' && scannerInstanceRef.current) {
          scannerInstanceRef.current.resume();
        }
      }, 3000);
    }
  };

  const handleManualQRInput = (e) => {
    e.preventDefault();
    if (qrToken.trim()) {
      handleScanQRCode(qrToken);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleScanMode = (mode) => {
    setScanMode(mode);
    setScanStatus('ready');
    setMessage('');
    setCameraError(null);
    setQrToken('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Mark Your Attendance</h1>
        <div style={styles.userInfo}>
          <span>Welcome, {user.fullName}</span>
          <span style={styles.userIdText}>ID: {user.userId || user.user_id || 'N/A'}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.contentContainer}>
        {/* Scan Mode Toggle */}
        <div style={styles.modeToggle}>
          <button
            style={{
              ...styles.modeButton,
              ...(scanMode === 'camera' ? styles.modeButtonActive : {}),
            }}
            onClick={() => toggleScanMode('camera')}
            disabled={scanStatus !== 'ready'}
          >
            📷 Camera Scan
          </button>
          <button
            style={{
              ...styles.modeButton,
              ...(scanMode === 'manual' ? styles.modeButtonActive : {}),
            }}
            onClick={() => toggleScanMode('manual')}
            disabled={scanStatus !== 'ready'}
          >
            ✏️ Manual Entry
          </button>
        </div>

        {/* Camera Scanning Section */}
        {scanMode === 'camera' && (
          <div style={styles.card}>
            <h2>Camera Scanner</h2>
            <p style={styles.description}>
              Point your camera at the QR code to mark attendance
            </p>

            {cameraError ? (
              <div style={styles.errorBox}>
                <p>⚠️ {cameraError}</p>
                <button
                  onClick={() => toggleScanMode('manual')}
                  style={styles.switchButton}
                >
                  Switch to Manual Entry
                </button>
              </div>
            ) : (
              <div
                id="qr-scanner"
                ref={scannerRef}
                style={styles.scanner}
              />
            )}

            {scanStatus === 'scanning' && (
              <div style={styles.loadingBar}>
                <div style={styles.loadingBarFill} />
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Section */}
        {scanMode === 'manual' && (
          <div style={styles.card}>
            <h2>Enter QR Code Token</h2>
            <p style={styles.description}>
              Paste the QR code token generated by your lecturer
            </p>

            <form onSubmit={handleManualQRInput} style={styles.form}>
              <input
                type="text"
                value={qrToken}
                onChange={(e) => setQrToken(e.target.value)}
                placeholder="Paste QR code token here..."
                style={styles.input}
                disabled={scanStatus !== 'ready'}
              />
              <button
                type="submit"
                disabled={scanStatus !== 'ready' || !qrToken.trim()}
                style={{
                  ...styles.button,
                  opacity: (scanStatus !== 'ready' || !qrToken.trim()) ? 0.6 : 1,
                }}
              >
                {scanStatus === 'scanning' ? 'Processing...' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {/* Location Status */}
        {locationStatus && (
          <div style={styles.statusCard}>
            <h3>📍 Location Status</h3>
            <div style={styles.statusContent}>
              <p>{locationStatus}</p>
              {locationAccuracy && (
                <p style={styles.accuracy}>
                  Accuracy: {locationAccuracy}m
                  {locationAccuracy > 50 && (
                    <span style={styles.accuracyWarning}> (May be outside geofence)</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Success Confirmation */}
        {confirmationData && scanStatus === 'success' && (
          <div style={styles.confirmationCard}>
            <div style={styles.checkmark}>✓</div>
            <h3>Attendance Confirmed</h3>
            <p>{confirmationData.course}</p>
            <p style={styles.time}>{confirmationData.time}</p>
            <p style={styles.status}>Status: <strong>{confirmationData.status}</strong></p>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div style={{
            ...styles.messageCard,
            ...(scanStatus === 'success' ? styles.successCard : styles.errorCard)
          }}>
            {message}
          </div>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && (
          <div style={styles.card}>
            <h3>📋 Recent Scans</h3>
            <div style={styles.historyList}>
              {scanHistory.map((scan, idx) => (
                <div key={idx} style={{
                  ...styles.historyItem,
                  ...(scan.status === 'success' ? styles.historySuccess : styles.historyError)
                }}>
                  <span>{scan.status === 'success' ? '✓' : '✗'}</span>
                  <span>{scan.timestamp}</span>
                  <span style={styles.historyToken}>{scan.token}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div style={styles.card}>
          <h3>📋 Student Attendance</h3>
          {attendanceHistory.length === 0 ? (
            <p style={styles.description}>No attendance records yet</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>Date</th>
                    <th style={styles.tableHeader}>Slot</th>
                    <th style={styles.tableHeader}>Lecturer</th>
                    <th style={styles.tableHeader}>Paper</th>
                    <th style={styles.tableHeader}>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.slice(0, 20).map((row) => (
                    <tr key={row.id}>
                      <td style={styles.tableCell}>
                        {row.class_date
                          ? new Date(row.class_date).toLocaleDateString()
                          : new Date(row.scan_time).toLocaleDateString()}
                      </td>
                      <td style={styles.tableCell}>
                        {row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : 'N/A'}
                      </td>
                      <td style={styles.tableCell}>{row.lecturer_name || 'N/A'}</td>
                      <td style={styles.tableCell}>
                        {row.course_code || ''} {row.course_name ? `(${row.course_name})` : ''}
                      </td>
                      <td style={styles.tableCell}>
                        <span
                          style={{
                            ...styles.badge,
                            ...(row.attendance_status === 'PRESENT' ? styles.badgePresent : styles.badgeAbsent),
                          }}
                        >
                          {row.attendance_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div style={styles.card}>
          <h3>How it works:</h3>
          <ol style={styles.steps}>
            <li>Your lecturer generates a QR code for the class session</li>
            <li>
              {scanMode === 'camera'
                ? 'Point your camera at the QR code'
                : 'Copy the QR code token and paste it above'}
            </li>
            <li>Your GPS location will be verified automatically</li>
            <li>Attendance will be marked once verified</li>
            <li>You'll see a confirmation message</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007bff',
    color: 'white',
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '28px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '14px',
  },
  userIdText: {
    fontSize: '12px',
    opacity: 0.9,
  },
  logoutBtn: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: '30px 20px',
    maxWidth: '700px',
    margin: '0 auto',
  },
  modeToggle: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
  },
  modeButton: {
    padding: '10px 20px',
    borderRadius: '4px',
    border: '2px solid #ddd',
    backgroundColor: 'white',
    color: '#666',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  modeButtonActive: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff',
  },
  card: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  description: {
    color: '#666',
    marginBottom: '20px',
    fontSize: '14px',
  },
  scanner: {
    width: '100%',
    maxWidth: '400px',
    margin: '0 auto',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  loadingBar: {
    width: '100%',
    height: '4px',
    backgroundColor: '#e0e0e0',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '20px',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#007bff',
    animation: 'loading 1s infinite',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    borderLeft: '4px solid #17a2b8',
  },
  statusContent: {
    fontSize: '13px',
    color: '#666',
  },
  accuracy: {
    marginTop: '10px',
    fontSize: '12px',
  },
  accuracyWarning: {
    color: '#ff9800',
    fontWeight: 'bold',
  },
  confirmationCard: {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    marginBottom: '20px',
    textAlign: 'center',
    borderTop: '4px solid #28a745',
    animation: 'slideDown 0.3s ease',
  },
  checkmark: {
    fontSize: '48px',
    color: '#28a745',
    marginBottom: '10px',
    animation: 'popIn 0.5s ease',
  },
  time: {
    color: '#999',
    fontSize: '13px',
    marginTop: '10px',
  },
  status: {
    marginTop: '10px',
    fontSize: '14px',
    color: '#666',
  },
  messageCard: {
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    fontWeight: 'bold',
  },
  successCard: {
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  errorBox: {
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    color: '#856404',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  switchButton: {
    marginTop: '10px',
    backgroundColor: '#ff9800',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  historyItem: {
    display: 'flex',
    gap: '15px',
    padding: '12px',
    borderRadius: '4px',
    fontSize: '13px',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  historySuccess: {
    backgroundColor: '#f0f8f0',
    borderLeft: '3px solid #28a745',
  },
  historyError: {
    backgroundColor: '#faf0f0',
    borderLeft: '3px solid #dc3545',
  },
  historyToken: {
    fontFamily: 'monospace',
    fontSize: '11px',
    color: '#999',
  },
  steps: {
    color: '#666',
    lineHeight: '1.8',
    fontSize: '14px',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  },
  tableHeader: {
    backgroundColor: '#f0f0f0',
    textAlign: 'left',
    padding: '10px',
    fontSize: '12px',
    borderBottom: '1px solid #ddd',
  },
  tableCell: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: '12px',
    verticalAlign: 'top',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
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
};

export default StudentScanner;
