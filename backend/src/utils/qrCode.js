const QRCode = require('qrcode');
const crypto = require('crypto');

// Generate a unique QR code token with encryption
async function generateQRCodeToken(sessionId, expiryMinutes = 5) {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(16).toString('hex');
  const token = `${sessionId}:${timestamp}:${randomString}`;
  
  // Encrypt the token
  const encryptedToken = encryptToken(token);
  return encryptedToken;
}

// Encrypt token
function encryptToken(token) {
  const secret = process.env.JWT_SECRET || 'default-secret-key-32-chars-min';
  // Derive a 32-byte key from the secret
  const key = crypto.createHash('sha256').update(String(secret)).digest();
  // Generate a random 16-byte IV
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Prepend IV to the encrypted data (IV doesn't need to be secret)
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt token
function decryptToken(encryptedToken) {
  try {
    const secret = process.env.JWT_SECRET || 'default-secret-key-32-chars-min';
    // Derive the same 32-byte key from the secret
    const key = crypto.createHash('sha256').update(String(secret)).digest();
    
    // Extract IV and encrypted data (split only on first colon)
    const firstColonIndex = encryptedToken.indexOf(':');
    if (firstColonIndex === -1) return null;
    
    const ivHex = encryptedToken.substring(0, firstColonIndex);
    const encrypted = encryptedToken.substring(firstColonIndex + 1);
    
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
}

// Generate QR code image data URL
async function generateQRCodeImage(qrToken) {
  try {
    const qrDataUrl = await QRCode.toDataURL(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw new Error('Failed to generate QR code');
  }
}

// Generate QR code as buffer
async function generateQRCodeBuffer(qrToken) {
  try {
    const qrBuffer = await QRCode.toBuffer(qrToken, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    });
    return qrBuffer;
  } catch (err) {
    console.error('Error generating QR code buffer:', err);
    throw new Error('Failed to generate QR code');
  }
}

module.exports = {
  generateQRCodeToken,
  encryptToken,
  decryptToken,
  generateQRCodeImage,
  generateQRCodeBuffer,
};
