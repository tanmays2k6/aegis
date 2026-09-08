import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('AEGIS Backend API Tests', () => {
  const app = createApp();

  describe('GET /api/v1/health', () => {
    it('should return 200 and operational status', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'aegis-api');
      expect(res.body).toHaveProperty('version', '1.0.0');
      expect(res.body).toHaveProperty('components');
      expect(res.body.components.api.status).toBe('operational');
    });
  });

  describe('Protected Routes Authentication', () => {
    it('should return 401 Unauthorized for /api/v1/auth/me without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/Authentication required/);
    });

    it('should return 401 Unauthorized for /api/v1/profile without token', async () => {
      const res = await request(app).get('/api/v1/profile');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/Authentication required/);
    });

    it('should return 401 Unauthorized when an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_mock_token_123');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toMatch(/Invalid or expired session token/);
    });
  });

  describe('Route Not Found', () => {
    it('should return 404 for unknown endpoints', async () => {
      const res = await request(app).get('/api/v1/non-existent-module');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });
});
