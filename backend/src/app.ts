import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRouter } from './routes/index.js';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    })
  );

  // 2. CORS configuration (Restricted to configured frontend origin)
  const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'];
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('CORS policy violation: Unauthorized origin'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 3. Request Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
  }

  // 4. Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 5. Rate Limiting
  app.use('/api/', apiRateLimiter);

  // 6. Base Root Check
  app.get('/', (_req, res) => {
    res.status(200).json({
      service: 'AEGIS - Authenticated Evidence & Government Investigation System',
      status: 'operational',
      version: '1.0.0',
      documentation: '/api/v1/health',
    });
  });

  // 7. API v1 Mount
  app.use('/api/v1', apiRouter);

  // 8. 404 Handler
  app.use((_req, res) => {
    res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: 'Resource not found',
    });
  });

  // 9. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
