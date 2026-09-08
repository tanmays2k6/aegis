export default function errorHandler(err, _req, res, _next) {
  console.error('API Error:', err.message);
  const status = err.status || 500;
  const message = status >= 500 ? 'Something went wrong on our end. Please try again.' : err.message;
  res.status(status).json({ error: message });
}
