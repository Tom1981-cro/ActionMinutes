import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  process.env.AI_FEATURE_ENABLED = 'false';
  process.env.INTEGRATIONS_FEATURE_ENABLED = 'false';
  process.env.NODE_ENV = 'test';
  
  if (process.env.FIXED_CLOCK === 'true') {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));
  }
});

afterAll(() => {
  if (process.env.FIXED_CLOCK === 'true') {
    vi.useRealTimers();
  }
});
