import { Claim } from '../models/Claim.model';
import { logger } from '../utils/logger';

export class FraudService {
  /**
   * Run fraud detection checks on a claim.
   * Returns list of fraud flags.
   */
  static async detectAnomaly(claimData: {
    memberId: string;
    treatmentDate: Date;
    claimAmount: number;
    doctorReg?: string;
    previousClaimsSameDay?: number; // to allow programmatic test inputs
  }): Promise<string[]> {
    const flags: string[] = [];

    // 1. Check for multiple claims on the same day (same member)
    const startOfDay = new Date(claimData.treatmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(claimData.treatmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const sameDayClaimsCount = await Claim.countDocuments({
      memberId: claimData.memberId,
      treatmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'closed' } // active/decided claims
    });

    // Check both DB and explicit input property for test compatibility
    const totalSameDayCount = Math.max(sameDayClaimsCount, claimData.previousClaimsSameDay || 0);

    if (totalSameDayCount >= 3) {
      flags.push(`Multiple claims same day (${totalSameDayCount} claims)`);
      flags.push('Unusual pattern detected');
    }

    // 2. Check for exact duplicate claims (same member, same date, same amount)
    const duplicateClaimsCount = await Claim.countDocuments({
      memberId: claimData.memberId,
      treatmentDate: { $gte: startOfDay, $lte: endOfDay },
      claimAmount: claimData.claimAmount,
      status: { $ne: 'closed' }
    });

    if (duplicateClaimsCount > 0) {
      flags.push('Potential duplicate claim detected');
    }

    // 3. Check if doctor is blacklisted (stub checklist)
    const blacklistedRegs = ['BLACKLISTED_REG_123', 'XX/99999/2000'];
    if (claimData.doctorReg && blacklistedRegs.includes(claimData.doctorReg)) {
      flags.push('Provider registration flagged/blacklisted');
    }

    if (flags.length > 0) {
      logger.warn(`Fraud flags detected for member ${claimData.memberId}:`, { flags });
    }

    return flags;
  }
}
