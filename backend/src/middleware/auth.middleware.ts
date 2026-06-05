import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'reviewer' | 'viewer';
  };
}

export function authMiddleware(roles?: Array<'admin' | 'reviewer' | 'viewer'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid format.' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const key = env.JWT_PUBLIC_KEY;
      
      // Basic check for PEM format if RS256 is used
      if (!key.includes('-----BEGIN PUBLIC KEY-----') && !key.includes('-----BEGIN RSA PUBLIC KEY-----')) {
        logger.error('JWT_PUBLIC_KEY is not in valid PEM format for RS256.');
        return res.status(500).json({ 
          error: 'Server configuration error: Invalid JWT Key format.',
          details: 'RS256 requires a valid RSA Public Key. Please run "node scripts/generate-keys.js" and update your environment variables.'
        });
      }

      // Validate using RS256 algorithm with public key
      const decoded = jwt.verify(token, key, {
        algorithms: ['RS256']
      }) as { id: string; email: string; role: 'admin' | 'reviewer' | 'viewer' };

      req.user = decoded;

      // Verify role authorization
      if (roles && !roles.includes(decoded.role)) {
        logger.warn(`Unauthorized role access attempt by user ${decoded.email}. Role required: ${roles}`);
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }

      next();
    } catch (err: any) {
      logger.error('JWT Verification failed:', err);
      return res.status(401).json({ error: 'Invalid or expired access token.' });
    }
  };
}
