/**
 * Centralized Error Handler Middleware
 */

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'Endpoint not found. API routes live under /api, web client lives at /',
  });
}

export function errorHandler(err, req, res, next) {
  console.error('[server error]', err.message || err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: err.message || 'Internal server error.',
  });
}
