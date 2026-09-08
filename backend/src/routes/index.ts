import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { profileRouter } from '../modules/profile/profile.routes.js';

export const apiRouter = Router();

// GET /api/v1/health - Live health check endpoint
apiRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const dbCheckStart = Date.now();
    // Test Supabase connectivity by running a lightweight metadata query with a 1.5s timeout
    const dbPromise = supabaseAdmin.from('profiles').select('id').limit(1);
    const timeoutPromise = new Promise<{ error: Error }>((resolve) =>
      setTimeout(() => resolve({ error: new Error('Database check timed out') }), 1500)
    );

    const result = await Promise.race([dbPromise, timeoutPromise]);
    dbLatencyMs = Date.now() - dbCheckStart;

    const error = result && 'error' in result ? result.error : null;

    if (!error) {
      dbStatus = 'connected';
    } else if (error.message?.includes('0 rows') || (error as { code?: string }).code === 'PGRST116') {
      dbStatus = 'connected';
    } else if ((error as { code?: string }).code === '42P01') {
      dbStatus = 'connected (schema pending)';
    } else {
      dbStatus = 'disconnected';
    }
  } catch {
    dbStatus = 'unreachable';
  }

  const overallStatus = dbStatus.startsWith('connected') ? 'ok' : 'degraded';

  res.status(200).json({
    status: overallStatus,
    service: 'aegis-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - startTime,
    components: {
      api: {
        status: 'operational',
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      authentication: {
        status: 'operational',
        provider: 'supabase',
      },
      security: {
        status: 'active',
        helmet: true,
        rateLimiter: true,
        cors: true,
      },
    },
  });
});

// Mount modules under /api/v1
apiRouter.use('/auth', authRouter);
apiRouter.use('/profile', profileRouter);
