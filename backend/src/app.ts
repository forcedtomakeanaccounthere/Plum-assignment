import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { seedUsersIfNone } from './routes/auth.routes';
import { PolicyService } from './services/policy.service';

// Import Route Handlers
import authRoutes from './routes/auth.routes';
import claimsRoutes from './routes/claims.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    }
  }
}));

app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true
}));

app.use(globalRateLimiter);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (configured to warm Render instances)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/claims/:id/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Database Connection & Initialization
async function startServer() {
  await connectDB();
  
  // Seed default admin/reviewer accounts and active policy
  await seedUsersIfNone();
  await PolicyService.getActivePolicy();

  const port = env.PORT;
  app.listen(port, () => {
    logger.info(`Plum OPD Claim Adjudication Server started on port ${port} in ${env.NODE_ENV} mode.`);
  });
}

// Start if not loaded as modular tests
if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
