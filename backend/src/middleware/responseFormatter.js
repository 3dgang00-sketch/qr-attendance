/**
 * Response Formatting Middleware
 * Provides consistent JSON response structure across all endpoints
 */

/**
 * Wraps successful responses in a standard format
 * Usage: res.success(data, message, statusCode)
 */
function successResponse(req, res, next) {
  res.success = (data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date(),
    });
  };

  res.created = (data, message = 'Resource created successfully') => {
    res.success(data, message, 201);
  };

  res.noContent = (message = 'Request successful') => {
    res.status(204).json({
      success: true,
      message,
      timestamp: new Date(),
    });
  };

  next();
}

/**
 * Formats paginated responses
 * Usage: res.paginated(data, totalCount, page, pageSize)
 */
function paginatedResponse(data, totalCount, page = 1, pageSize = 10) {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    success: true,
    data,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    timestamp: new Date(),
  };
}

module.exports = {
  successResponse,
  paginatedResponse,
};
