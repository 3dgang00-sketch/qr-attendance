import React, { useState } from 'react';
import axios from 'axios';

function RegisterNew() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [proposedRole, setProposedRole] = useState('STUDENT');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('register'); // register, verify, pending

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate inputs
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email,
        password,
        fullName,
        proposedRole,
        department: department || null,
      });

      setSuccess(response.data.message);
      setStep('pending');
      // Reset form
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Attendance Management System</p>

        {step === 'register' && (
          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={styles.input}
                placeholder="Your full name"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                placeholder="your@email.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="Min. 8 characters"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm Password *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                style={styles.input}
                placeholder="Re-enter password"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Role</label>
              <select
                value={proposedRole}
                onChange={(e) => setProposedRole(e.target.value)}
                style={styles.input}
              >
                <option value="STUDENT">Student</option>
                <option value="LECTURER">Lecturer</option>
                <option value="DEPT_ADMIN">Department Admin</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Department (Optional)</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                style={styles.input}
                placeholder="e.g., Computer Science"
              />
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {success && <div style={styles.success}>{success}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}

        {step === 'pending' && (
          <div style={styles.statusBox}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.statusTitle}>Registration Submitted!</h2>
            <p style={styles.statusText}>
              Thank you for registering. Please check your email at <strong>{email}</strong> to verify your account.
            </p>
            <div style={styles.infoBox}>
              <h4>Next Steps:</h4>
              <ol style={styles.infoBullets}>
                <li>Click the verification link in your email (expires in 24 hours)</li>
                <li>An administrator will review your request</li>
                <li>You'll receive an approval notification via email</li>
                <li>Once approved, you can log in with your credentials</li>
              </ol>
            </div>
            <button
              onClick={() => window.location.href = '/login'}
              style={styles.button}
            >
              Return to Login
            </button>
          </div>
        )}

        <div style={styles.helpBox}>
          <h4>❓ Questions?</h4>
          <p style={styles.helpText}>Contact your institution's IT department or administration for registration assistance.</p>
        </div>

        <p style={styles.footer}>
          Already have an account? <a href="/login" style={styles.link}>Login here</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '500px',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '5px',
  },
  subtitle: {
    textAlign: 'center',
    color: '#999',
    fontSize: '14px',
    marginBottom: '30px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
  },
  select: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
  },
  button: {
    padding: '12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
  },
  error: {
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    padding: '10px',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '14px',
  },
  success: {
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '10px',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '14px',
  },
  statusBox: {
    textAlign: 'center',
    padding: '30px 0',
  },
  successIcon: {
    fontSize: '48px',
    color: '#4caf50',
    marginBottom: '15px',
  },
  statusTitle: {
    color: '#4caf50',
    marginBottom: '15px',
  },
  statusText: {
    color: '#666',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: '15px',
    borderRadius: '4px',
    marginBottom: '20px',
    border: '1px solid #90caf9',
    textAlign: 'left',
  },
  infoBullets: {
    color: '#1565c0',
    fontSize: '13px',
    paddingLeft: '20px',
    margin: '10px 0 0 0',
  },
  helpBox: {
    backgroundColor: '#fff3cd',
    padding: '15px',
    borderRadius: '4px',
    marginTop: '20px',
    border: '1px solid #ffc107',
  },
  helpText: {
    color: '#856404',
    fontSize: '13px',
    margin: '10px 0 0 0',
  },
  footer: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#666',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
};

export default RegisterNew;
