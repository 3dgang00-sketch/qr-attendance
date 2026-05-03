const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Utilities and Middleware
const { validateEnvironment, getConfig } = require('./utils/envValidator');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { getMorganMiddleware, requestLogger } = require('./middleware/logger');
const { successResponse } = require('./middleware/responseFormatter');

// ==================== Environment Validation ====================
try {
  validateEnvironment();
} catch (error) {
  console.error('❌ Environment Configuration Error:', error.message);
  process.exit(1);
}

const config = getConfig();
const app = express();

// ==================== Security Middleware ====================
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));

// ==================== Request Parsing ====================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ==================== Compression & Logging ====================
app.use(compression());
app.use(getMorganMiddleware());
app.use(requestLogger);

// ==================== Response Formatting ====================
app.use(successResponse);

// ==================== Rate Limiting ====================
app.use(generalLimiter);

// ==================== Health Check ====================
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    environment: config.nodeEnv,
    uptime: process.uptime(),
  });
});

// ==================== API Routes ====================
app.use('/api', routes);

// ==================== Error Handling ====================
// Must be placed after all other routes and middleware
app.use(notFoundHandler);
app.use(errorHandler);

// ==================== Server Start ====================
const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║  Attendance Management System Backend Server Started         ║
    ║  Environment: ${config.nodeEnv.padEnd(50)}║
    ║  Port: ${PORT}
    ║  API: http://localhost:${PORT}/api
    ║  Health Check: http://localhost:${PORT}/health
    ║  Log Level: ${process.env.LOG_LEVEL || 'info'.padEnd(50)}║
    ╚══════════════════════════════════════════════════════════════╝
  `);
});

// ==================== Graceful Shutdown ====================
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Starting graceful shutdown...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Starting graceful shutdown...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// ==================== Unhandled Error Handlers ====================
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
