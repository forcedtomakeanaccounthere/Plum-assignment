import { Router, Response, NextFunction } from 'express';
import { RAGService } from '../services/rag.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { chatRateLimiter } from '../middleware/rateLimiter.middleware';
import { logger } from '../utils/logger';

const router = Router({ mergeParams: true });

/**
 * POST /claims/:id/chat
 * Execute RAG chat over the claim documents
 */
router.post(
  '/',
  chatRateLimiter,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const claimId = req.params.id;
      const { message } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required.' });
      }

      // RAG search & reply generation
      try {
        const result = await RAGService.queryClaimRAG(claimId, message.trim());
        return res.status(200).json(result);
      } catch (err: any) {
        if (err.message.includes('Invalid query pattern') || err.message.includes('Query length')) {
          return res.status(400).json({ error: 'Invalid query' });
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
