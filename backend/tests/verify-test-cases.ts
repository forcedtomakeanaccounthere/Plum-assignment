import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Claim } from '../src/models/Claim.model';
import { Policy } from '../src/models/Policy.model';
import { User } from '../src/models/User.model';
import { AuditLog } from '../src/models/AuditLog.model';
import { connectDB, closeDB } from '../src/config/db';
import { PolicyService } from '../src/services/policy.service';
import { AdjudicationService } from '../src/services/adjudication.service';
import { RAGService } from '../src/services/rag.service';
import { logger } from '../src/utils/logger';

async function runVerification() {
  logger.info('Starting 10 Test Cases Automated Verification...');
  
  // 1. Connect to DB
  await connectDB();

  // 2. Clear existing documents for a clean test run
  logger.info('Clearing test collection data...');
  await Claim.deleteMany({});
  await Policy.deleteMany({});
  await User.deleteMany({});
  await AuditLog.deleteMany({});

  // 3. Setup active policy config
  logger.info('Loading default active policy terms...');
  const policy = await PolicyService.getActivePolicy();
  logger.info(`Loaded Policy: ${policy.policy_name} (${policy.policy_id})`);

  // 4. Load test cases
  const testCasesPath = path.resolve(__dirname, '../../project guide/test_cases.json');
  const testCasesData = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
  const testCases = testCasesData.test_cases;

  logger.info(`Loaded ${testCases.length} test cases from test_cases.json`);

  let passedCount = 0;

  for (const tc of testCases) {
    logger.info(`----------------------------------------------------------------`);
    logger.info(`RUNNING: ${tc.case_id} - ${tc.case_name}`);
    logger.info(`Description: ${tc.description}`);

    try {
      const input = tc.input_data;
      const expected = tc.expected_output;

      // Map mock documents
      const docs = [];
      let mockOcr = '';
      let mockExtractedFields: any = {};

      if (input.documents.prescription) {
        docs.push({
          type: 'prescription' as const,
          cloudinaryUrl: 'https://res.cloudinary.com/mock/prescription.jpg',
          ocrText: `Prescription for ${input.member_name}. Diagnosed: ${input.documents.prescription.diagnosis}. Dr. ${input.documents.prescription.doctor_name}, Reg: ${input.documents.prescription.doctor_reg}.`,
          processingStatus: 'extracted' as const
        });
        mockOcr += `Prescription for ${input.member_name}. Diagnosis: ${input.documents.prescription.diagnosis}. Reg: ${input.documents.prescription.doctor_reg}. `;
        mockExtractedFields.document_type = 'prescription';
        mockExtractedFields.patient_name = { value: input.member_name, confidence: 0.98 };
        mockExtractedFields.doctor_name = { value: input.documents.prescription.doctor_name, confidence: 0.95 };
        mockExtractedFields.doctor_registration = { value: input.documents.prescription.doctor_reg, confidence: 0.97 };
        mockExtractedFields.diagnosis = { value: input.documents.prescription.diagnosis, confidence: 0.95 };
        mockExtractedFields.date = { value: input.treatment_date, confidence: 0.99 };
        mockExtractedFields.medicines = (input.documents.prescription.medicines_prescribed || []).map((m: string) => ({
          name: m,
          confidence: 0.95
        }));
        mockExtractedFields.procedures = (input.documents.prescription.procedures || []).map((p: string) => ({
          name: p,
          amount: input.documents.bill?.[p.toLowerCase().replace(/ /g, '_')] || 8000,
          confidence: 0.95
        }));
      }

      if (input.documents.bill) {
        docs.push({
          type: 'bill' as const,
          cloudinaryUrl: 'https://res.cloudinary.com/mock/bill.jpg',
          ocrText: `Invoice. Consultation: ${input.documents.bill.consultation_fee || 0}. Diagnostics: ${input.documents.bill.diagnostic_tests || 0}. Total: ${input.claim_amount}`,
          processingStatus: 'extracted' as const
        });
        mockOcr += `Bill total: ${input.claim_amount}. `;
        
        const itemized: any[] = [];
        if (input.documents.bill.consultation_fee) {
          itemized.push({ item: 'Consultation Fee', amount: input.documents.bill.consultation_fee, category: 'consultation' });
        }
        if (input.documents.bill.diagnostic_tests) {
          itemized.push({ item: 'Diagnostics', amount: input.documents.bill.diagnostic_tests, category: 'diagnostic' });
        }
        // Include any procedured billing
        Object.keys(input.documents.bill).forEach((key) => {
          if (key !== 'consultation_fee' && key !== 'diagnostic_tests' && key !== 'test_names') {
            itemized.push({ item: key, amount: input.documents.bill[key], category: 'procedure' });
          }
        });
        mockExtractedFields.itemized_costs = itemized;
        mockExtractedFields.total_amount = { value: input.claim_amount, confidence: 0.99 };
      }

      // Create claim model
      const claim = new Claim({
        claimId: tc.case_id,
        memberId: input.member_id,
        memberName: input.member_name,
        treatmentDate: new Date(input.treatment_date),
        claimAmount: input.claim_amount,
        hospitalName: input.hospital,
        cashlessRequest: input.cashless_request,
        submittedAt: new Date(input.treatment_date), // assume submitted same day
        documents: docs,
        status: 'processing'
      });

      // Pass join date if present in case
      if (input.member_join_date) {
        (claim as any).memberJoinDate = new Date(input.member_join_date);
      }

      // 1. Run Rule Engine
      const ruleResult = await AdjudicationService.runRuleEngine(claim, mockExtractedFields, input.previous_claims_same_day);
      claim.ruleEngineResult = ruleResult;

      // 2. Run AI Adjudication
      const aiResult = await AdjudicationService.runAIDecision(claim, mockExtractedFields, ruleResult);
      claim.aiDecisionResult = aiResult;

      // 3. Fuse Decisions
      const fused = AdjudicationService.fuseDecisions(ruleResult, aiResult);

      claim.finalDecision = {
        decision: fused.decision,
        approvedAmount: fused.approvedAmount,
        rejectionReasons: fused.rejectionReasons,
        deductions: fused.deductions,
        confidenceScore: fused.confidenceScore,
        notes: fused.notes,
        decidedAt: new Date()
      };

      claim.status = fused.decision === 'MANUAL_REVIEW' ? 'under_review' : 'decided';
      await claim.save();

      // Index for RAG
      await RAGService.indexClaimDocument(tc.case_id, 'combined', mockOcr);

      // Verify outcomes
      const decisionMatches = claim.finalDecision.decision === expected.decision;
      const amountMatches = claim.finalDecision.approvedAmount === (expected.approved_amount ?? 0);
      
      let rejectionReasonMatches = true;
      if (expected.rejection_reasons) {
        rejectionReasonMatches = expected.rejection_reasons.every((r: string) => 
          claim.finalDecision.rejectionReasons.includes(r)
        );
      }

      logger.info(`Expected: ${expected.decision} (Amount: ₹${expected.approved_amount})`);
      logger.info(`Actual  : ${claim.finalDecision.decision} (Amount: ₹${claim.finalDecision.approvedAmount})`);
      logger.info(`Confidence: ${claim.finalDecision.confidenceScore}`);
      logger.info(`Deductions: ${JSON.stringify(claim.finalDecision.deductions)}`);
      logger.info(`Rejection Reasons: ${JSON.stringify(claim.finalDecision.rejectionReasons)}`);

      if (decisionMatches && amountMatches && rejectionReasonMatches) {
        logger.info(`RESULT  : ✅ PASSED`);
        passedCount++;
      } else {
        logger.error(`RESULT  : ❌ FAILED`);
        if (!decisionMatches) logger.error(`  Mismatch: Decision expected ${expected.decision}, got ${claim.finalDecision.decision}`);
        if (!amountMatches) logger.error(`  Mismatch: Approved Amount expected ₹${expected.approved_amount}, got ₹${claim.finalDecision.approvedAmount}`);
        if (!rejectionReasonMatches) logger.error(`  Mismatch: Rejection reasons expected ${JSON.stringify(expected.rejection_reasons)}, got ${JSON.stringify(claim.finalDecision.rejectionReasons)}`);
      }

    } catch (err) {
      logger.error(`Exception during execution of ${tc.case_id}:`, err);
    }
  }

  logger.info(`================================================================`);
  logger.info(`VERIFICATION REPORT: ${passedCount}/${testCases.length} Passed`);
  logger.info(`================================================================`);

  // Close DB
  await closeDB();
  process.exit(passedCount === testCases.length ? 0 : 1);
}

runVerification().catch((err) => {
  console.error('Fatal error during verification run:', err);
  process.exit(1);
});
