import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { logger } from './logger';

let aiClient: GoogleGenAI | null = null;
if (env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  } catch (err) {
    logger.error('Failed to initialize Gemini embedding client:', err);
  }
}

/**
 * Generate 768-dimensional text embedding
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const model = 'text-embedding-004';
  
  if (!aiClient) {
    // Return dummy 768-dimensional vector if Gemini API is not configured
    logger.debug('No API Key. Returning fallback mock embedding vector.');
    const mockVector = new Array(768).fill(0).map(() => Math.random() - 0.5);
    // Normalize mock vector
    const mag = Math.sqrt(mockVector.reduce((sum, val) => sum + val * val, 0));
    return mockVector.map((val) => val / mag);
  }

  try {
    const response: any = await aiClient.models.embedContent({
      model,
      contents: text,
    });
    
    if (response.embedding && response.embedding.values) {
      return response.embedding.values;
    }
    throw new Error('Embeddings values missing in API response.');
  } catch (error) {
    logger.error('Error generating embedding from Gemini:', error);
    // Fallback to random normalized vector
    const mockVector = new Array(768).fill(0).map(() => Math.random() - 0.5);
    const mag = Math.sqrt(mockVector.reduce((sum, val) => sum + val * val, 0));
    return mockVector.map((val) => val / mag);
  }
}

/**
 * Helper to calculate cosine similarity between two vectors
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return 0;
  let dotProduct = 0;
  let v1Mag = 0;
  let v2Mag = 0;
  
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
    v1Mag += v1[i] * v1[i];
    v2Mag += v2[i] * v2[i];
  }
  
  if (v1Mag === 0 || v2Mag === 0) return 0;
  return dotProduct / (Math.sqrt(v1Mag) * Math.sqrt(v2Mag));
}
