import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`AEGIS API server started successfully`, {
    port: env.PORT,
    environment: env.NODE_ENV,
    healthEndpoint: `http://localhost:${env.PORT}/api/v1/health`,
  });
});

// Graceful shutdown handling
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down AEGIS API gracefully...`);
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
