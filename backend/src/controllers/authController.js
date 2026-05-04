const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Register new user
async function register(req, res) {
  try {
    const { userId, email, password, fullName, role, department } = req.body;

    // Validate input
    if (!userId || !email || !password || !fullName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (user_id, email, password_hash, full_name, role, department) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, email, hashedPassword, fullName, role || 'STUDENT', department]
    );

    // Fetch the inserted user
    const userResult = await pool.query('SELECT id, user_id, email, full_name, role FROM users WHERE email = ?', [email]);

    res.status(201).json({
      message: 'User registered successfully',
      user: userResult.rows[0],
    });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'User ID or email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
}

// Login user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Debug logging
    console.log('[AUTH DEBUG] Login attempt:', { email, passwordLength: password.length });

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('[AUTH DEBUG] User query result rows count:', result.rows ? result.rows.length : 0);

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
    res.status(500).json({ error: err.message });
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
  login,
  getProfile,
  updateProfile,
};
