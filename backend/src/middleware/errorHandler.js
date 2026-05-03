/**
 * Comprehensive Error Handling Middleware
 * Handles all types of errors and returns consistent error responses
 */

const { AppError, ValidationError } = require('../utils/AppError');

/**
 * Main error handling middleware
 * Should be the last middleware in the application
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', {
    message: err.message,
    code: err.code,
    statusCode: err.statusCode,
    timestamp: new Date(),
    path: req.path,
    method: req.method,
  });

  // Handle AppError instances (custom errors)
  if (err instanceof AppError) {
    const response = err.toJSON();
    return res.status(err.statusCode).json(response);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    const appErr = new AppError('Invalid token', 401, 'INVALID_TOKEN');
    return res.status(appErr.statusCode).json(appErr.toJSON());
  }

  if (err.name === 'TokenExpiredError') {
    const appErr = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
    return res.status(appErr.statusCode).json(appErr.toJSON());
  }

  // Database errors
  if (err.code === '23505' || err.message?.includes('UNIQUE constraint')) {
    const appErr = new AppError('Resource already exists', 409, 'DUPLICATE_ENTRY');
    return res.status(appErr.statusCode).json(appErr.toJSON());
  }

  if (err.code === '23503') {
    const appErr = new AppError('Invalid reference ID', 400, 'INVALID_REFERENCE');
    return res.status(appErr.statusCode).json(appErr.toJSON());
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  const errorResponse = {
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      statusCode,
      timestamp: new Date(),
    },
  };

  // Include stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 Not Found handler
 * Should be placed after all route definitions
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      message: `Cannot ${req.method} ${req.path}`,
      code: 'ROUTE_NOT_FOUND',
      statusCode: 404,
      timestamp: new Date(),
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
