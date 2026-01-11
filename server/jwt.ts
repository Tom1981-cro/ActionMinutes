import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'action-minutes-jwt-secret-dev-only';
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('[JWT] WARNING: JWT_SECRET not set in production. Using fallback secret.');
}

interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  exp: number;
  iat: number;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function createSignature(header: string, payload: string): string {
  const data = `${header}.${payload}`;
  return crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
}

export function signToken(payload: Omit<TokenPayload, 'iat'>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Date.now();
  const tokenPayload = { ...payload, iat: now };
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = createSignature(header, encodedPayload);
  return `${header}.${encodedPayload}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = createSignature(header, payload);

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(base64UrlDecode(payload)) as TokenPayload;

    if (decoded.exp < Date.now()) return null;

    return decoded;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenPair(user: User): { accessToken: string; refreshToken: string; refreshTokenRaw: string } {
  const accessToken = signToken({
    userId: user.id,
    email: user.email || '',
    type: 'access',
    exp: Date.now() + ACCESS_TOKEN_EXPIRY,
  });

  const refreshTokenRaw = crypto.randomBytes(32).toString('hex');
  const refreshToken = signToken({
    userId: user.id,
    email: user.email || '',
    type: 'refresh',
    exp: Date.now() + REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken, refreshTokenRaw };
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY);
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      userId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.type !== 'access') {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = await storage.getUser(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }

  req.user = user;
  req.userId = user.id;
  next();
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload && payload.type === 'access') {
      const user = await storage.getUser(payload.userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
  }

  next();
}
