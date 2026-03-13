/**
 * Standardized API Response Format
 * 
 * All responses follow this structure:
 * {
 *   success: boolean,
 *   data?: T,
 *   error?: { code: string, message: string, details?: any },
 *   meta?: Record<string, any>
 * }
 */

/**
 * Create a successful response
 * @param {*} data - Response data
 * @param {Object} meta - Optional metadata (pagination, count, etc.)
 * @returns {Object} standardized success response
 */
export const successResponse = (data = null, meta = null) => ({
  success: true,
  data,
  ...(meta && { meta }),
});

/**
 * Create an error response
 * @param {string} code - Error code (e.g., 'VALIDATION_ERROR', 'DB_ERROR')
 * @param {string} message - Human-readable error message
 * @param {*} details - Optional detailed error information
 * @returns {Object} standardized error response
 */
export const errorResponse = (code, message, details = null) => ({
  success: false,
  error: {
    code,
    message,
    ...(details && { details }),
  },
});

/**
 * Express middleware for standardized error handling
 * Usage: app.use(errorHandler) - should be last middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json(
      errorResponse('VALIDATION_ERROR', 'Request validation failed', err.errors)
    );
  }

  // Supabase auth errors
  if (err.code && err.code.startsWith('PGRST')) {
    return res.status(400).json(
      errorResponse('DATABASE_ERROR', 'Database operation failed', err.message)
    );
  }

  // Express/default errors
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected error occurred';

  return res.status(statusCode).json(
    errorResponse(errorCode, errorMessage, process.env.NODE_ENV === 'development' ? err.stack : undefined)
  );
};

/**
 * Wraps async route handlers to catch errors
 * Usage: app.post('/path', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Helper for sending paginated responses
 */
export const paginatedResponse = (data, page, pageSize, total) => {
  return successResponse(data, {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
};
