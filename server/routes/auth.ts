import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { storage } from '../storage';
import { signToken, verifyToken, hashToken, generateTokenPair, getRefreshTokenExpiry, requireAuth } from '../jwt';

const router = Router();

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordSchema,
  name: z.string().min(1, 'Name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password, name } = parsed.data;

    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await storage.createUser({
      email,
      password: hashedPassword,
      name,
    });

    const { accessToken, refreshTokenRaw } = generateTokenPair(user);
    const tokenHash = hashToken(refreshTokenRaw);

    await storage.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });

    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: { ...user, password: undefined },
      accessToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email, password } = parsed.data;

    const user = await storage.getUserByEmail(email);
    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    await storage.revokeAllUserRefreshTokens(user.id);

    const { accessToken, refreshTokenRaw } = generateTokenPair(user);
    const tokenHash = hashToken(refreshTokenRaw);

    await storage.createRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });

    res.cookie('refreshToken', refreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: { ...user, password: undefined },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshTokenRaw = req.cookies?.refreshToken;

    if (!refreshTokenRaw) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }

    const tokenHash = hashToken(refreshTokenRaw);
    const storedToken = await storage.getRefreshTokenByHash(tokenHash);

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      res.clearCookie('refreshToken', { path: '/' });
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }

    const user = await storage.getUser(storedToken.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    await storage.revokeRefreshToken(storedToken.id);

    const { accessToken, refreshTokenRaw: newRefreshTokenRaw } = generateTokenPair(user);
    const newTokenHash = hashToken(newRefreshTokenRaw);

    await storage.createRefreshToken({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: getRefreshTokenExpiry(),
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });

    res.cookie('refreshToken', newRefreshTokenRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({
      user: { ...user, password: undefined },
      accessToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshTokenRaw = req.cookies?.refreshToken;

    if (refreshTokenRaw) {
      const tokenHash = hashToken(refreshTokenRaw);
      const storedToken = await storage.getRefreshTokenByHash(tokenHash);
      if (storedToken) {
        await storage.revokeRefreshToken(storedToken.id);
      }
    }

    res.clearCookie('refreshToken', { path: '/' });
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

router.get('/user', requireAuth, async (req: Request, res: Response) => {
  res.json({ ...req.user, password: undefined });
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { email } = parsed.data;
    const user = await storage.getUserByEmail(email);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    if (!user) return;

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);

    await storage.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    console.log(`Password reset token for ${email}: ${resetToken}`);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { token, password } = parsed.data;
    const tokenHash = hashToken(token);

    const resetToken = await storage.getPasswordResetTokenByHash(tokenHash);

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await storage.updateUser(resetToken.userId, { password: hashedPassword });
    await storage.markPasswordResetTokenUsed(resetToken.id);
    await storage.revokeAllUserRefreshTokens(resetToken.userId);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
