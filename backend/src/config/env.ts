import dotenv from 'dotenv';
import { z } from 'zod';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

function normalizePem(value: string | undefined): string {
  if (!value) return '';

  return value
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n');
}

function isPlaceholderKey(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    !value ||
    lowered.includes('your_') ||
    lowered.includes('placeholder') ||
    lowered.includes('change_me') ||
    lowered.includes('generate-keys')
  );
}

function isPrivatePem(value: string): boolean {
  return /-----BEGIN (RSA )?PRIVATE KEY-----/.test(value);
}

function isPublicPem(value: string): boolean {
  return /-----BEGIN (RSA )?PUBLIC KEY-----/.test(value);
}

function generateTemporaryKeyPair() {
  console.log('Generating temporary RS256 key pair for JWT (development only)...');
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
}

const configuredPrivateKey = normalizePem(process.env.JWT_PRIVATE_KEY);
const configuredPublicKey = normalizePem(process.env.JWT_PUBLIC_KEY);
const hasUsableConfiguredKeys =
  !isPlaceholderKey(configuredPrivateKey) &&
  !isPlaceholderKey(configuredPublicKey) &&
  isPrivatePem(configuredPrivateKey) &&
  isPublicPem(configuredPublicKey);

let fallbackPrivateKey = '';
let fallbackPublicKey = '';

if (!hasUsableConfiguredKeys) {
  const { privateKey, publicKey } = generateTemporaryKeyPair();
  fallbackPrivateKey = privateKey;
  fallbackPublicKey = publicKey;
}

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('3001'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/plum_opd'),
  JWT_PRIVATE_KEY: z.string().optional().transform((val) => {
    const normalized = normalizePem(val);
    return hasUsableConfiguredKeys ? normalized : fallbackPrivateKey;
  }),
  JWT_PUBLIC_KEY: z.string().optional().transform((val) => {
    const normalized = normalizePem(val);
    return hasUsableConfiguredKeys ? normalized : fallbackPublicKey;
  }),
  GEMINI_API_KEY: z.string().optional().default(''), // allow empty for mock/fallback mode
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  MISTRAL_API_KEY: z.string().optional().default(''),
  FRONTEND_URL: z.string().default('https://plum-assignment-gules.vercel.app/'),
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

if (!hasUsableConfiguredKeys) {
  console.warn(
    'JWT_PRIVATE_KEY/JWT_PUBLIC_KEY were missing or invalid, so a temporary RS256 key pair was generated for this process.'
  );
}
export type Env = z.infer<typeof envSchema>;
