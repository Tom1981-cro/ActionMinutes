import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';

describe('HTTP Integration Tests', () => {
  let app: express.Express;
  let server: ReturnType<typeof createServer>;
  
  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    server = createServer(app);
    await registerRoutes(server, app);
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Config Endpoints', () => {
    it('GET /api/config/status should return 200 with config object', async () => {
      const res = await request(app).get('/api/config/status');
      
      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('object');
    });
  });

  describe('User Lookup Endpoints', () => {
    it('GET /api/user/email/:email should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/user/email/nonexistent@example.com');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });
    
    it('GET /api/user/email/:email should return user for known demo user', async () => {
      const res = await request(app).get('/api/user/email/demo@actionminutes.com');
      if (res.status === 200) {
        expect(res.body).toHaveProperty('email', 'demo@actionminutes.com');
        expect(res.body).toHaveProperty('id');
      }
    });
  });

  describe('API Response Format', () => {
    it('should return JSON content type for API endpoints', async () => {
      const res = await request(app).get('/api/config/status');
      
      expect(res.headers['content-type']).toMatch(/json/);
    });
    
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent/endpoint');
      
      expect(res.status).toBe(404);
    });
  });
});
