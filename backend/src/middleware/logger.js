/**
 * Logging Configuration
 * Sets up morgan for HTTP request logging and winston for general logging
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom morgan format for development
 */
const devFormat = ':method :url :status :response-time ms';

/**
 * Custom morgan format for production
 */
const prodFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms';

/**
 * Get morgan middleware configured for the environment
 */
function getMorganMiddleware() {
  if (process.env.NODE_ENV === 'production') {
    // Write to file in production
    const accessLogStream = fs.createWriteStream(
      path.join(logsDir, 'access.log'),
      { flags: 'a' }
    );

    return morgan(prodFormat, {
      stream: accessLogStream,
    });
  }

  // Console output in development
  return morgan(devFormat);
}

/**
 * Simple request logger middleware
 * Logs request details for debugging
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[${logLevel.toUpperCase()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    }
  });

  next();
}

module.exports = {
  getMorganMiddleware,
  requestLogger,
};
