/** Maps rule engine codes to human-readable adjudication categories */
export const RULE_CATEGORY_MAP: Record<string, { category: string; label: string }> = {
  BELOW_MIN_AMOUNT: { category: 'amount_limits', label: 'Amount & Limits' },
  LATE_SUBMISSION: { category: 'timeline', label: 'Timeline & Waiting Period' },
  MISSING_DOCUMENTS: { category: 'document_compliance', label: 'Document Compliance' },
  DOCTOR_REG_INVALID: { category: 'document_compliance', label: 'Document Compliance' },
  PATIENT_MISMATCH: { category: 'identity_verification', label: 'Identity Verification' },
  DATE_MISMATCH: { category: 'timeline', label: 'Timeline & Waiting Period' },
  POLICY_INACTIVE: { category: 'policy_eligibility', label: 'Policy Eligibility' },
  WAITING_PERIOD: { category: 'timeline', label: 'Timeline & Waiting Period' },
  SERVICE_NOT_COVERED: { category: 'coverage_exclusions', label: 'Coverage & Exclusions' },
  PRE_AUTH_MISSING: { category: 'authorization', label: 'Pre-Authorization' },
  PER_CLAIM_EXCEEDED: { category: 'amount_limits', label: 'Amount & Limits' },
  ANNUAL_LIMIT_EXCEEDED: { category: 'amount_limits', label: 'Amount & Limits' },
  COSMETIC_EXCLUSION: { category: 'coverage_exclusions', label: 'Coverage & Exclusions' },
  DENTAL_LIMIT: { category: 'amount_limits', label: 'Amount & Limits' },
  PHARMACY_COPAY: { category: 'amount_limits', label: 'Amount & Limits' },
  CONSULTATION_COPAY: { category: 'amount_limits', label: 'Amount & Limits' },
  DUPLICATE_CLAIM: { category: 'fraud_risk', label: 'Fraud & Anomaly' },
};

export interface RuleCategoryExplain {
  category: string;
  label: string;
  reasons: Array<{ code: string; message: string; passed: boolean }>;
}

export interface AdjudicationExplainability {
  decision: string;
  confidenceScore: number;
  aiConfidence: number;
  aiReasoning: string;
  ruleCategories: RuleCategoryExplain[];
  topReasons: string[];
  fraudTriggered: boolean;
  fraudFlags: string[];
  needsHumanIntervention: boolean;
  urgentReview: boolean;
  humanInterventionReasons: string[];
  partialCoverageNote?: string;
  aiAccuracyNote: string;
}

function collectRuleFailures(ruleResults: Record<string, any>): Array<{ code: string; message: string }> {
  const failures: Array<{ code: string; message: string }> = [];
  for (const key of Object.keys(ruleResults || {})) {
    const r = ruleResults[key];
    if (r && r.pass === false && r.code) {
      failures.push({ code: r.code, message: r.reason || r.code });
    }
  }
  return failures;
}

export function buildExplainability(
  ruleResult: {
    hardReject: boolean;
    partial: boolean;
    reasons: string[];
    flags: string[];
    ruleResults: Record<string, any>;
  },
  aiResult: {
    recommendation: string;
    confidence: number;
    reasoning: string;
    fraud_flags: string[];
    requires_human_review: boolean;
    rejection_reasons: string[];
  },
  fused: {
    decision: string;
    confidenceScore: number;
    rejectionReasons: string[];
    notes: string;
  }
): AdjudicationExplainability {
  const failures = collectRuleFailures(ruleResult.ruleResults);
  const allCodes = new Set([
    ...ruleResult.reasons,
    ...failures.map((f) => f.code),
    ...fused.rejectionReasons,
    ...aiResult.rejection_reasons,
  ]);

  const categoryMap = new Map<string, RuleCategoryExplain>();

  for (const code of allCodes) {
    const meta = RULE_CATEGORY_MAP[code] || { category: 'other', label: 'Other Rules' };
    if (!categoryMap.has(meta.category)) {
      categoryMap.set(meta.category, { category: meta.category, label: meta.label, reasons: [] });
    }
    const entry = categoryMap.get(meta.category)!;
    const failure = failures.find((f) => f.code === code);
    if (failure && !entry.reasons.some((r) => r.code === code)) {
      entry.reasons.push({ code, message: failure.message, passed: false });
    }
  }

  for (const [key, val] of Object.entries(ruleResult.ruleResults || {})) {
    if (val?.pass === true) continue;
    const code = val?.code || key;
    const meta = RULE_CATEGORY_MAP[code] || { category: 'other', label: 'Other Rules' };
    if (!categoryMap.has(meta.category)) {
      categoryMap.set(meta.category, { category: meta.category, label: meta.label, reasons: [] });
    }
    const entry = categoryMap.get(meta.category)!;
    if (!entry.reasons.some((r) => r.code === code)) {
      entry.reasons.push({
        code,
        message: val?.reason || val?.flags?.join?.(', ') || code,
        passed: false,
      });
    }
  }

  const fraudFlags = Array.from(
    new Set([...(ruleResult.flags || []), ...(aiResult.fraud_flags || [])])
  );
  if (fraudFlags.length > 0) {
    categoryMap.set('fraud_risk', {
      category: 'fraud_risk',
      label: 'Fraud & Anomaly',
      reasons: fraudFlags.map((f) => ({ code: 'FRAUD_FLAG', message: f, passed: false })),
    });
  }

  const fraudTriggered = fraudFlags.length > 0;
  const isPartial = fused.decision === 'PARTIAL' || ruleResult.partial || aiResult.recommendation === 'PARTIAL';
  const humanInterventionReasons: string[] = [];

  if (fraudTriggered) {
    humanInterventionReasons.push('Fraud indicators detected — urgent human review required');
  }
  if (isPartial) {
    humanInterventionReasons.push(
      'Partial approval: part of treatment covered, part excluded or over limit — reviewer should confirm split'
    );
  }
  if (fused.decision === 'MANUAL_REVIEW' || aiResult.requires_human_review) {
    humanInterventionReasons.push('Low confidence or borderline case flagged for manual review');
  }
  if (fused.confidenceScore < 0.7 || aiResult.confidence < 0.7) {
    humanInterventionReasons.push(`AI confidence below threshold (${(aiResult.confidence * 100).toFixed(0)}%)`);
  }

  const needsHumanIntervention =
    fraudTriggered ||
    isPartial ||
    fused.decision === 'MANUAL_REVIEW' ||
    aiResult.requires_human_review ||
    fused.confidenceScore < 0.7;

  const topReasons = [
    ...failures.map((f) => f.message),
    ...aiResult.rejection_reasons,
    ...fused.rejectionReasons,
    ...humanInterventionReasons,
  ].filter((v, i, arr) => v && arr.indexOf(v) === i).slice(0, 8);

  const aiAccuracyNote =
    aiResult.confidence >= 0.85
      ? 'High AI agreement with extracted data and rules'
      : aiResult.confidence >= 0.7
        ? 'Moderate AI confidence — cross-check recommended'
        : 'Low AI confidence — manual verification advised';

  return {
    decision: fused.decision,
    confidenceScore: fused.confidenceScore,
    aiConfidence: aiResult.confidence,
    aiReasoning: aiResult.reasoning || fused.notes,
    ruleCategories: Array.from(categoryMap.values()),
    topReasons,
    fraudTriggered,
    fraudFlags,
    needsHumanIntervention,
    urgentReview: fraudTriggered,
    humanInterventionReasons,
    partialCoverageNote: isPartial
      ? 'Part of the treatment is covered; part is not. Claim may exceed sub-limits — approved up to applicable limit only.'
      : undefined,
    aiAccuracyNote,
  };
}
