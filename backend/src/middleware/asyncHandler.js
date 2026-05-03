/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors without try-catch blocks
 * Usage: app.get('/route', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
