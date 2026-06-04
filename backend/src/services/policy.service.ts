import { Policy, IPolicy } from '../models/Policy.model';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

// Node.js module-level cache for active policy configuration
let cachedActivePolicy: Record<string, any> | null = null;

export class PolicyService {
  /**
   * Load active policy from cache or DB.
   * If none exists, seeds it from the 'project guide/policy_terms.json' file.
   */
  static async getActivePolicy(): Promise<Record<string, any>> {
    if (cachedActivePolicy) {
      return cachedActivePolicy;
    }

    let policy: any = await Policy.findOne({ isActive: true });
    if (!policy) {
      logger.info('No active policy found. Seeding initial policy from policy_terms.json...');
      policy = await this.seedInitialPolicy();
    }

    cachedActivePolicy = policy ? policy.config : null;
    return cachedActivePolicy || {};
  }

  /**
   * Seed initial policy terms config from project files
   */
  private static async seedInitialPolicy(): Promise<IPolicy> {
    try {
      const defaultTermsPath = path.resolve(__dirname, '../../../project guide/policy_terms.json');
      const raw = fs.readFileSync(defaultTermsPath, 'utf-8');
      const config = JSON.parse(raw);

      const policy = new Policy({
        version: 1,
        uploadedBy: 'system',
        isActive: true,
        config
      });

      await policy.save();
      logger.info('Seeded default Policy version 1 successfully.');
      return policy;
    } catch (err) {
      logger.error('Error seeding initial policy:', err);
      // Fallback fallback if file read fails
      const fallbackConfig = {
        policy_id: "PLUM_OPD_2024",
        policy_name: "Plum OPD Advantage",
        coverage_details: {
          annual_limit: 50000,
          per_claim_limit: 5000,
          consultation_fees: { covered: true, sub_limit: 2000, copay_percentage: 10, network_discount: 20 }
        },
        exclusions: ["Cosmetic procedures", "Weight loss treatments"]
      };

      const policy = new Policy({
        version: 1,
        uploadedBy: 'system',
        isActive: true,
        config: fallbackConfig
      });
      await policy.save();
      return policy;
    }
  }

  /**
   * Upload and validate a new policy JSON string
   */
  static async uploadPolicy(config: Record<string, any>, uploadedBy: string): Promise<IPolicy> {
    const latest = await Policy.findOne().sort({ version: -1 });
    const version = latest ? latest.version + 1 : 1;

    const newPolicy = new Policy({
      version,
      uploadedBy,
      isActive: false,
      config
    });

    await newPolicy.save();
    return newPolicy;
  }

  /**
   * Activate a specific policy version
   */
  static async activatePolicy(version: number): Promise<IPolicy> {
    const policy = await Policy.findOne({ version });
    if (!policy) {
      throw new Error(`Policy version ${version} not found.`);
    }

    // Deactivate current active policy
    await Policy.updateMany({ isActive: true }, { isActive: false });

    // Activate the selected policy
    policy.isActive = true;
    await policy.save();

    // Invalidate the cache
    cachedActivePolicy = policy.config;
    logger.info(`Policy version ${version} activated. Cache invalidated.`);

    return policy;
  }

  /**
   * Get complete policy version history
   */
  static async getHistory(): Promise<IPolicy[]> {
    return Policy.find().sort({ version: -1 });
  }

  /**
   * Invalidate memory cache explicitly
   */
  static invalidateCache(): void {
    cachedActivePolicy = null;
  }

  /**
   * Compute a simple field-level diff between two policy configurations
   */
  static computeDiff(oldConfig: Record<string, any>, newConfig: Record<string, any>): Record<string, any> {
    const diff: Record<string, any> = { added: {}, removed: {}, modified: {} };
    
    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)]);
    
    for (const key of allKeys) {
      if (!(key in oldConfig)) {
        diff.added[key] = newConfig[key];
      } else if (!(key in newConfig)) {
        diff.removed[key] = oldConfig[key];
      } else if (JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])) {
        diff.modified[key] = {
          from: oldConfig[key],
          to: newConfig[key]
        };
      }
    }
    
    return diff;
  }
}
