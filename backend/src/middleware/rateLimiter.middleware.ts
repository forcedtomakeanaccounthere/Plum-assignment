import rateLimit from 'express-rate-limit';

// Global API rate limit: 100 requests per 15 minutes
export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// Claims submission limit: 10 claims per minute
export const claimSubmissionRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many claim submissions, please try again after 1 minute.' }
});

// RAG chat limit: 20 messages per IP/session per hour (simplified to per IP for Express middleware)
export const chatRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded: Max 20 chat messages per hour for this claim.' }
});
