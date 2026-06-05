import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { seedUsersIfNone } from './routes/auth.routes';
import { PolicyService } from './services/policy.service';
import { setupSwagger } from './config/swagger';

// Import Route Handlers
import authRoutes from './routes/auth.routes';
import claimsRoutes from './routes/claims.routes';
import chatRoutes from './routes/chat.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "http://localhost:3001"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    }
  }
}));

const configuredFrontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
const allowedOrigins = [
  configuredFrontendUrl,
  'https://plum-assignment-gules.vercel.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (
      allowedOrigins.includes(normalizedOrigin) ||
      /\.vercel\.app$/.test(new URL(normalizedOrigin).hostname) ||
      env.NODE_ENV === 'development'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(globalRateLimiter);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// Health Check Endpoint (configured to warm Render instances)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', time: new Date() });
});

// Register API Routes
setupSwagger(app);
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
