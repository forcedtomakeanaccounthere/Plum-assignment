import { Schema, model, Document } from 'mongoose';

export interface IDocumentDetail {
  type: 'prescription' | 'bill' | 'lab_report' | 'pharmacy_bill' | 'supporting';
  cloudinaryUrl: string;
  originalFileName?: string;
  mediaFormat?: 'image' | 'pdf';
  mimeType?: string;
  ocrText: string;
  extractedFields: Record<string, any>;
  processingStatus: 'pending' | 'ocr_done' | 'extracted' | 'failed';
}

export interface IAdjudicationExplainability {
  decision: string;
  confidenceScore: number;
  aiConfidence: number;
  aiReasoning: string;
  ruleCategories: Array<{
    category: string;
    label: string;
    reasons: Array<{ code: string; message: string; passed: boolean }>;
  }>;
  topReasons: string[];
  fraudTriggered: boolean;
  fraudFlags: string[];
  needsHumanIntervention: boolean;
  urgentReview: boolean;
  humanInterventionReasons: string[];
  partialCoverageNote?: string;
  aiAccuracyNote: string;
}

export interface ICostItem {
  item: string;
  amount: number;
  category: 'consultation' | 'medicine' | 'diagnostic' | 'procedure' | 'other';
}

export interface IClaim extends Document {
  claimId: string;
  memberId: string;
  memberName: string;
  treatmentDate: Date;
  submittedAt: Date;
  claimAmount: number;
  hospitalName?: string;
  cashlessRequest?: boolean;
  documents: IDocumentDetail[];
  extractedSummary: {
    diagnosis?: string;
    doctorName?: string;
    doctorReg?: string;
    totalBilledAmount?: number;
    itemizedCosts: ICostItem[];
  };
  ruleEngineResult?: Record<string, any>;
  aiDecisionResult?: Record<string, any>;
  adjudicationExplainability?: IAdjudicationExplainability;
  finalDecision: {
    decision: 'APPROVED' | 'REJECTED' | 'PARTIAL' | 'MANUAL_REVIEW';
    approvedAmount: number;
    rejectionReasons: string[];
    deductions: Array<{ reason: string; amount: number }>;
    confidenceScore: number;
    notes?: string;
    decidedAt: Date;
  };
  manualOverride?: {
    overriddenBy: string;
    originalDecision: string;
    newDecision: string;
    reason: string;
    overriddenAt: Date;
  } | null;
  chatHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{
      documentType: string;
      chunkText: string;
      bboxHints?: { x: number; y: number; w: number; h: number } | null;
      similarityScore?: number;
    }>;
    timestamp: Date;
  }>;
  processingTimeMs: number;
  status: 'processing' | 'decided' | 'under_review' | 'closed';
  vectorStore?: Array<{
    chunkIndex: number;
    documentType: string;
    rawText: string;
    vector: number[];
  }>;
}

const ClaimSchema = new Schema<IClaim>(
  {
    claimId: { type: String, required: true, unique: true, index: true },
    memberId: { type: String, required: true, index: true },
    memberName: { type: String, required: true },
    treatmentDate: { type: Date, required: true, index: true },
    submittedAt: { type: Date, default: Date.now },
    claimAmount: { type: Number, required: true },
    hospitalName: { type: String },
    cashlessRequest: { type: Boolean, default: false },
    documents: [
      {
        type: { type: String, enum: ['prescription', 'bill', 'lab_report', 'pharmacy_bill', 'supporting'], required: true },
        cloudinaryUrl: { type: String, required: true },
        originalFileName: { type: String },
        mediaFormat: { type: String, enum: ['image', 'pdf'] },
        mimeType: { type: String },
        ocrText: { type: String, default: '' },
        extractedFields: { type: Schema.Types.Mixed, default: {} },
        processingStatus: { type: String, enum: ['pending', 'ocr_done', 'extracted', 'failed'], default: 'pending' }
      }
    ],
    extractedSummary: {
      diagnosis: { type: String },
      doctorName: { type: String },
      doctorReg: { type: String },
      totalBilledAmount: { type: Number },
      itemizedCosts: [
        {
          item: { type: String, required: true },
          amount: { type: Number, required: true },
          category: { type: String, enum: ['consultation', 'medicine', 'diagnostic', 'procedure', 'other'], required: true }
        }
      ]
    },
    ruleEngineResult: { type: Schema.Types.Mixed, default: {} },
    aiDecisionResult: { type: Schema.Types.Mixed, default: {} },
    adjudicationExplainability: { type: Schema.Types.Mixed, default: null },
    finalDecision: {
      decision: { type: String, enum: ['APPROVED', 'REJECTED', 'PARTIAL', 'MANUAL_REVIEW'], required: true },
      approvedAmount: { type: Number, required: true },
      rejectionReasons: [{ type: String }],
      deductions: [
        {
          reason: { type: String, required: true },
          amount: { type: Number, required: true }
        }
      ],
      confidenceScore: { type: Number, required: true },
      notes: { type: String },
      decidedAt: { type: Date, default: Date.now }
    },
    manualOverride: {
      overriddenBy: { type: String },
      originalDecision: { type: String },
      newDecision: { type: String },
      reason: { type: String },
      overriddenAt: { type: Date }
    },
    chatHistory: [
      {
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        sources: [
          {
            documentType: { type: String },
            chunkText: { type: String },
            bboxHints: {
              x: { type: Number },
              y: { type: Number },
              w: { type: Number },
              h: { type: Number }
            },
            similarityScore: { type: Number }
          }
        ],
        timestamp: { type: Date, default: Date.now }
      }
    ],
    processingTimeMs: { type: Number, default: 0 },
    status: { type: String, enum: ['processing', 'decided', 'under_review', 'closed'], default: 'processing', index: true },
    vectorStore: [
      {
        chunkIndex: { type: Number },
        documentType: { type: String },
        rawText: { type: String },
        vector: [{ type: Number }]
      }
    ]
  },
  { timestamps: true }
);

export const Claim = model<IClaim>('Claim', ClaimSchema);
