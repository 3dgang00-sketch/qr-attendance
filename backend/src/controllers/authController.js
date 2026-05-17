const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { emailService } = require('../utils/emailService');
const { generateTemporaryPassword, generateUsername } = require('../utils/credentialsGenerator');

// Register new user (creates request, requires admin approval)
async function register(req, res) {
  try {
    const { email, password, fullName, proposedRole = 'STUDENT', department } = req.body;

    // Validate input
    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Check if email already exists in users or requests
    const existingUser = await pool.query('SELECT email FROM users WHERE email = ?', [email]);
    if (existingUser.rows && existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingRequest = await pool.query(
      'SELECT email FROM user_registration_requests WHERE email = ? AND request_status IN (?, ?)',
      [email, 'PENDING', 'EMAIL_VERIFIED']
    );
    if (existingRequest.rows && existingRequest.rows.length > 0) {
      return res.status(409).json({ error: 'Registration request already exists for this email' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create registration request
    await pool.query(
      'INSERT INTO user_registration_requests (email, full_name, password_hash, proposed_role, department, verification_token, verification_token_expires, request_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email, fullName, hashedPassword, proposedRole, department || null, verificationToken, tokenExpiry, 'PENDING']
    );

    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    try {
      await emailService.sendVerificationEmail(email, fullName, verificationLink);
      console.log(`✓ Verification email sent to ${email}`);
    } catch (emailErr) {
      console.warn(`⚠️ Could not send verification email: ${emailErr.message}`);
      // Don't fail registration if email fails, but log it
    }

    res.status(201).json({
      message: 'Registration request created. Please check your email to verify your account.',
      email,
      note: 'After email verification, an administrator will review and approve your request.'
    });
  } catch (err) {
    console.error('[AUTH ERROR] Registration error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
}

// Verify email token
async function verifyEmail(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    const result = await pool.query(
      "SELECT id, email, full_name FROM user_registration_requests WHERE verification_token = ? AND verification_token_expires > NOW()",
      [token]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const request = result.rows[0];

    // Update request status
    await pool.query(
      'UPDATE user_registration_requests SET request_status = ?, is_email_verified = 1, verified_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['EMAIL_VERIFIED', request.id]
    );

    res.json({
      message: 'Email verified successfully. Your request is now pending admin approval.',
      email: request.email
    });
  } catch (err) {
    console.error('[AUTH ERROR] Email verification error:', err);
    res.status(500).json({ error: err.message || 'Verification failed' });
  }
}

// Admin: Get pending registration requests
async function getPendingRequests(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, email, full_name, proposed_role, department, request_status, is_email_verified, requested_at FROM user_registration_requests WHERE request_status IN (?, ?) ORDER BY requested_at DESC',
      ['PENDING', 'EMAIL_VERIFIED']
    );

    res.json({
      requests: result.rows || [],
      total: (result.rows || []).length
    });
  } catch (err) {
    console.error('[AUTH ERROR] Get pending requests error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch requests' });
  }
}

// Admin: Approve registration request
async function approveRegistration(req, res) {
  try {
    const { requestId } = req.params;
    const adminId = req.user.id;

    console.log('[DEBUG] Approve registration - User:', req.user);

    if (!['SUPER_ADMIN', 'DEPT_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can approve registrations' });
    }

    // Get registration request
    const requestResult = await pool.query(
      'SELECT * FROM user_registration_requests WHERE id = ?',
      [requestId]
    );

    if (!requestResult.rows || requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    const regRequest = requestResult.rows[0];

    if (regRequest.request_status === 'APPROVED') {
      return res.status(400).json({ error: 'Request already approved' });
    }

    if (!regRequest.is_email_verified) {
      return res.status(400).json({ error: 'Email must be verified before approval' });
    }

    // Generate user_id
    const userId = `${regRequest.proposed_role}_${Date.now()}`;
    
    // Generate temporary password and username
    const tempPassword = generateTemporaryPassword();
    const username = generateUsername(regRequest.email);
    const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

    // Create actual user account with temporary password
    await pool.query(
      'INSERT INTO users (user_id, email, password_hash, full_name, role, department, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [userId, regRequest.email, tempPasswordHash, regRequest.full_name, regRequest.proposed_role, regRequest.department]
    );

    // Update request status
    await pool.query(
      'UPDATE user_registration_requests SET request_status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['APPROVED', adminId, requestId]
    );

    // Send credentials email with username and temporary password
    try {
      await emailService.sendCredentialsEmail(regRequest.email, regRequest.full_name, username, tempPassword);
      console.log(`✓ Credentials email sent to ${regRequest.email} with username: ${username}`);
    } catch (emailErr) {
      console.warn(`⚠️ Could not send credentials email: ${emailErr.message}`);
    }

    res.json({
      message: 'Registration approved successfully',
      user: {
        email: regRequest.email,
        fullName: regRequest.full_name,
        role: regRequest.proposed_role,
        username: username
      }
    });
  } catch (err) {
    console.error('[AUTH ERROR] Approve registration error:', err);
    res.status(500).json({ error: err.message || 'Approval failed' });
  }
}

// Admin: Reject registration request
async function rejectRegistration(req, res) {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!['SUPER_ADMIN', 'DEPT_ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only admins can reject registrations' });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get registration request
    const requestResult = await pool.query(
      'SELECT * FROM user_registration_requests WHERE id = ?',
      [requestId]
    );

    if (!requestResult.rows || requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    const regRequest = requestResult.rows[0];

    if (regRequest.request_status === 'REJECTED') {
      return res.status(400).json({ error: 'Request already rejected' });
    }

    // Update request status
    await pool.query(
      'UPDATE user_registration_requests SET request_status = ?, rejection_reason = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['REJECTED', reason, adminId, requestId]
    );

    // Send rejection email
    try {
      await emailService.sendRejectionEmail(regRequest.email, regRequest.full_name, reason);
      console.log(`✓ Rejection email sent to ${regRequest.email}`);
    } catch (emailErr) {
      console.warn(`⚠️ Could not send rejection email: ${emailErr.message}`);
    }

    res.json({
      message: 'Registration request rejected',
      email: regRequest.email
    });
  } catch (err) {
    console.error('[AUTH ERROR] Reject registration error:', err);
    res.status(500).json({ error: err.message || 'Rejection failed' });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        userId: user.user_id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        department: user.department || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        userId: user.user_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error('[AUTH ERROR] Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
}

// Get current user profile
async function getProfile(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, user_id, email, full_name, role, department, is_active, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Update user profile
async function updateProfile(req, res) {
  try {
    const { fullName, phone } = req.body;

    await pool.query(
      'UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [fullName, phone, req.user.id]
    );

    const result = await pool.query(
      'SELECT id, user_id, email, full_name, role, department, phone FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  register,
  verifyEmail,
  getPendingRequests,
  approveRegistration,
  rejectRegistration,
  login,
  getProfile,
  updateProfile,
};
