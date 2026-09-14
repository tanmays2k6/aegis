export default function errorHandler(err, _req, res, _next) {
  console.error('API Error:', err.message);
  const databasePolicyError = err.code === '42501';
  const invalidIdentifierError = err.code === '22P02';
  const duplicateRecordError = err.code === '23505';
  const isProduction = process.env.NODE_ENV === 'production';
  const status = databasePolicyError ? 503 : invalidIdentifierError ? 400 : duplicateRecordError ? 409 : (err.status || 500);
  const message = databasePolicyError
    ? 'The database access policy is incomplete. Apply the latest AEGIS database migration, then try again.'
    : invalidIdentifierError
      ? 'An invalid record identifier was supplied. Refresh the page and try again.'
      : duplicateRecordError
        ? 'That case / FIR number already exists. Use a different number or open the existing case.'
      : status >= 500 && !isProduction
        ? err.message || 'The service could not complete this request.'
        : status >= 500
        ? 'The service could not complete this request. Please try again shortly.'
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
