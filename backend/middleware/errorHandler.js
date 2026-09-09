export default function errorHandler(err, _req, res, _next) {
  console.error('API Error:', err.message);
  const status = err.status || 500;
  const message =
    status >= 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Operation failed.';

  const code = err.code || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR');

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
