import dotenv from 'dotenv';
import { z } from 'zod';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Helper to generate RSA key pairs if they are missing in development
let fallbackPrivateKey = '';
let fallbackPublicKey = '';

if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Generating temporary RS256 key pair for JWT (development only)...');
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    fallbackPrivateKey = privateKey;
    fallbackPublicKey = publicKey;
  }
}

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/plum_opd'),
  JWT_PRIVATE_KEY: z.string().transform((val) => val || fallbackPrivateKey).default(() => fallbackPrivateKey),
  JWT_PUBLIC_KEY: z.string().transform((val) => val || fallbackPublicKey).default(() => fallbackPublicKey),
  GEMINI_API_KEY: z.string().optional().default(''), // allow empty for mock/fallback mode
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  MISTRAL_API_KEY: z.string().optional().default(''),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PYTHON_PATH: z.string().optional().default('python'),
  POPPLER_PATH: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;

// Additional check to crash in production if keys/apis are missing
if (env.NODE_ENV === 'production') {
  if (!env.JWT_PRIVATE_KEY || !env.JWT_PUBLIC_KEY) {
    console.error('Production Error: JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.');
    process.exit(1);
  }
}
export type Env = z.infer<typeof envSchema>;
