/**
 * Environment Variable Validator
 * Ensures all required environment variables are set
 */
const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'JWT_SECRET',
  'DATABASE_URL',
];                   
const optionalEnvVars = [
  'ALLOWED_ORIGINS',
  'LOG_LEVEL',
  'SESSION_TIMEOUT',
  'QR_EXPIRY_SECONDS',
];

/**
 * Validates environment configuration
 * Throws error if required variables are missing
 */
function validateEnvironment() {
  const missing = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file or environment setup.'
    );
  }

  // Validate specific values
  const validEnvs = ['development', 'production', 'staging', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV)) {
    throw new Error(
      `Invalid NODE_ENV: ${process.env.NODE_ENV}. ` +
      `Must be one of: ${validEnvs.join(', ')}`
    );
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET is short. Consider using a longer secret for production.');
  }

  // Validate port number
  const port = parseInt(process.env.PORT, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535.`);
  }

  console.log('✓ Environment variables validated successfully');
}

/**
 * Get environment configuration object
 */
function getConfig() {
  return {
    port: parseInt(process.env.PORT, 10),
    nodeEnv: process.env.NODE_ENV,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiry: process.env.JWT_EXPIRY || '24h',
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      name: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    session: {
      timeout: parseInt(process.env.SESSION_TIMEOUT || '24', 10),
    },
    qr: {
      expirySeconds: parseInt(process.env.QR_EXPIRY_SECONDS || '30', 10),
      refreshIntervalSeconds: parseInt(process.env.QR_REFRESH_INTERVAL || '30', 10),
    },
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  };
}

module.exports = {
  validateEnvironment,
  getConfig,
};
