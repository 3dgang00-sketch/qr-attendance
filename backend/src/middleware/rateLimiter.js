const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Max 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.',
});

// QR code scan rate limiter - per student per session
const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Max 3 scan attempts per 5 minutes
  keyGenerator: (req) => {
    // Use user ID and session ID as key
    return `${req.user?.id}:${req.body?.sessionId}`;
  },
  message: 'Too many scan attempts. Please wait before trying again.',
  skip: (req) => !req.user, // Skip if not authenticated
});

// Attendance marking rate limiter
const attendanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2,
  keyGenerator: (req) => {
    return `${req.user?.id}`;
  },
  message: 'Rate limited. Please wait before marking attendance again.',
});

module.exports = {
  generalLimiter,
  loginLimiter,
  scanLimiter,
  attendanceLimiter,
};
