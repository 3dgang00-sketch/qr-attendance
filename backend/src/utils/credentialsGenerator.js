/**
 * Utility functions for generating temporary passwords and credentials
 */

/**
 * Generate a secure temporary password
 * @param {number} length - Length of the password (default: 12)
 * @returns {string} Temporary password
 */
function generateTemporaryPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  let password = '';
  
  // Ensure password has at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Generate a username from email
 * @param {string} email - User email
 * @returns {string} Generated username
 */
function generateUsername(email) {
  // Extract the part before @ and replace dots with underscores
  const baseUsername = email.split('@')[0].replace(/\./g, '_').toLowerCase();
  return baseUsername;
}

/**
 * Generate a unique username with timestamp
 * @param {string} email - User email
 * @returns {string} Unique username
 */
function generateUniqueUsername(email) {
  const baseUsername = generateUsername(email);
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  return `${baseUsername}_${timestamp}`;
}

module.exports = {
  generateTemporaryPassword,
  generateUsername,
  generateUniqueUsername,
};
