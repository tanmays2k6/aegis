import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';

import authRoutes from './routes/authRoutes.js';
import caseRoutes from './routes/caseRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

// 1. HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // In development with Vite HMR
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Strict CORS Configuration (Restrict to configured origin)
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests or allowed frontend origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not permitted by AEGIS CORS policy.`));
      }
    },
    credentials: true,
  })
);

// 3. Parsers
app.use(cookieParser());
app.use(express.json({ limit: '15mb' }));

// 4. Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.',
    },
  },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

// 5. Health Check
app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'AEGIS Security API' }));

// 6. Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/admin', adminRoutes);

// 7. Global Error Handler
app.use(errorHandler);

// Vercel Serverless / Local server support
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`AEGIS Chain of Custody API running securely on port ${PORT}`));
}

export default app;
