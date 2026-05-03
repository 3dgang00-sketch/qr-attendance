const crypto = require('crypto');

// Generate device fingerprint from device info
function generateDeviceFingerprint(deviceInfo) {
  const fingerprint = `${deviceInfo.userAgent}:${deviceInfo.language}:${deviceInfo.timezone}:${deviceInfo.platform}`;
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');
  return hash;
}

// Validate device fingerprint consistency
function validateDeviceFingerprint(storedFingerprint, currentFingerprint, tolerance = 0.8) {
  // Exact match is best
  if (storedFingerprint === currentFingerprint) return true;

  // For enhanced security, could implement fuzzy matching
  // This is a simplified version that requires exact match
  return storedFingerprint === currentFingerprint;
}

module.exports = {
  generateDeviceFingerprint,
  validateDeviceFingerprint,
};
