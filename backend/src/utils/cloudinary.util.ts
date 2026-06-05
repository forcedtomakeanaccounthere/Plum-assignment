import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { logger } from './logger';

if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
  logger.info('Cloudinary configured successfully in utility.');
} else {
  logger.warn('Cloudinary credentials missing in environment variables.');
}

export class CloudinaryUtil {
  static async uploadFile(filePath: string, folder: string = 'plum_opd_samples'): Promise<string> {
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary not configured');
    }

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'auto'
      });
      return result.secure_url;
    } catch (error) {
      logger.error('Cloudinary upload failed:', error);
      throw error;
    }
  }

  static isConfigured(): boolean {
    return !!(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
  }
}
