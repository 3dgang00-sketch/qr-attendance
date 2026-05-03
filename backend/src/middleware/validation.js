/**
 * Input Validation Middleware
 * Provides common validation rules for API endpoints
 */
const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/AppError');

/**
 * Validation rules for user registration
 */
const registerValidation = [
  body('userId')
    .trim()
    .notEmpty().withMessage('User ID is required')
    .isLength({ min: 3, max: 20 }).withMessage('User ID must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('User ID can only contain letters, numbers, hyphens, and underscores'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
  
  body('role')
    .optional()
    .isIn(['STUDENT', 'LECTURER', 'DEPT_ADMIN', 'SUPER_ADMIN'])
    .withMessage('Invalid role'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Department name too long'),
];

/**
 * Validation rules for login
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address'),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for QR scan
 */
const scanQRValidation = [
  body('qrToken')
    .trim()
    .notEmpty().withMessage('QR token is required'),
  
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  
  body('deviceFingerprint')
    .trim()
    .notEmpty().withMessage('Device fingerprint is required'),
];

/**
 * Validation rules for creating a session
 */
const createSessionValidation = [
  body('courseId')
    .trim()
    .notEmpty().withMessage('Course ID is required'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Session name is required')
    .isLength({ max: 255 }).withMessage('Session name too long'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('Location too long'),
  
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

/**
 * Validation handler middleware
 * Checks for validation errors and responds with details
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = {};
    
    errors.array().forEach(error => {
      const field = error.param;
      if (!errorDetails[field]) {
        errorDetails[field] = [];
      }
      errorDetails[field].push(error.msg);
    });
    
    return next(new ValidationError('Input validation failed', errorDetails));
  }
  
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  scanQRValidation,
  createSessionValidation,
  handleValidationErrors,
};
