import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.model';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Helper to sign tokens using RS256 private key
function signAccessToken(user: any): string {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    env.JWT_PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '1h' }
  );
}

function signRefreshToken(user: any): string {
  return jwt.sign(
    { id: user._id },
    env.JWT_PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '7d' }
  );
}

/**
 * Seed helper to verify users exist, else seed default credentials
 */
export async function seedUsersIfNone(): Promise<void> {
  const count = await User.countDocuments();
  if (count === 0) {
    logger.info('No users found in database. Seeding default roles...');
    
    const adminHash = await bcrypt.hash('Password123', 10);
    const reviewerHash = await bcrypt.hash('Password123', 10);
    const viewerHash = await bcrypt.hash('Password123', 10);

    await User.create([
      { email: 'admin@plum.com', name: 'Plum Admin', passwordHash: adminHash, role: 'admin' },
      { email: 'reviewer@plum.com', name: 'Plum Reviewer', passwordHash: reviewerHash, role: 'reviewer' },
      { email: 'viewer@plum.com', name: 'Plum Viewer', passwordHash: viewerHash, role: 'viewer' }
    ]);
    
    logger.info('Default credentials seeded: admin@plum.com, reviewer@plum.com, viewer@plum.com (Password: Password123)');
  }
}

/**
 * POST /auth/login
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const check = loginSchema.safeParse(req.body);
    if (!check.success) {
      return res.status(400).json({ error: 'Invalid inputs provided.' });
    }

    const { email, password } = check.data;

    // Ensure users seeded
    await seedUsersIfNone();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info(`User logged in successfully: ${user.email}`);

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    try {
      const decoded = jwt.verify(refreshToken, env.JWT_PUBLIC_KEY, {
        algorithms: ['RS256']
      }) as { id: string };

      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
      }

      const newAccessToken = signAccessToken(user);
      return res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  return res.status(200).json({ message: 'Logged out' });
});

export default router;
