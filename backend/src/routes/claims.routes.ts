import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { Claim, IClaim } from '../models/Claim.model';
import { AuditLog } from '../models/AuditLog.model';
import { OcrService } from '../services/ocr.service';
import { ExtractionService } from '../services/extraction.service';
import { AdjudicationService } from '../services/adjudication.service';
import { RAGService } from '../services/rag.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { claimSubmissionRateLimiter } from '../middleware/rateLimiter.middleware';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Cloudinary package is optional fallback
let cloudinary: any = null;
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  try {
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET
    });
    logger.info('Cloudinary configured successfully.');
  } catch (err) {
    logger.error('Failed to configure Cloudinary:', err);
  }
}

const router = Router();

// Configure local multer storage inside workspace temporary uploads directory
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, and PDF are allowed.'));
    }
  }
});

// SSE connections map: claimId -> Response
const sseConnections = new Map<string, Response>();

function sendSSEEvent(claimId: string, eventName: string, data: any) {
  const res = sseConnections.get(claimId);
  if (res) {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

/**
 * Helper to generate CLM_YYYYMMDD_XXXX IDs
 */
function generateClaimId(): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CLM_${dateStr}_${rand}`;
}

interface CloudinaryDocInput {
  url: string;
  type: string;
  originalname?: string;
}

async function downloadToTempFile(url: string, originalname: string): Promise<string> {
  const ext = path.extname(originalname) || path.extname(new URL(url).pathname) || '.jpg';
  const destPath = path.join(uploadDir, `cloud-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  const client = url.startsWith('https') ? https : http;

  await new Promise<void>((resolve, reject) => {
    client
      .get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          downloadToTempFile(response.headers.location, originalname).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: HTTP ${response.statusCode}`));
          return;
        }
        const fileStream = fs.createWriteStream(destPath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        fileStream.on('error', reject);
      })
      .on('error', reject);
  });

  return destPath;
}

/**
 * POST /claims
 * Initiates claim processing
 */
router.post(
  '/',
  claimSubmissionRateLimiter,
  upload.array('files[]', 10),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      let files = (req.files as Express.Multer.File[]) || [];
      const { memberId, memberName, treatmentDate, claimAmount, hospitalName, cashlessRequest, documentTypes, cloudinaryDocuments } = req.body;

      if ((!files || files.length === 0) && cloudinaryDocuments) {
        let parsedDocs: CloudinaryDocInput[] = [];
        try {
          parsedDocs = typeof cloudinaryDocuments === 'string'
            ? JSON.parse(cloudinaryDocuments)
            : cloudinaryDocuments;
        } catch {
          return res.status(400).json({ error: 'Invalid cloudinaryDocuments JSON.' });
        }

        if (!Array.isArray(parsedDocs) || parsedDocs.length === 0) {
          return res.status(400).json({ error: 'At least one Cloudinary document is required.' });
        }

        const downloaded: Express.Multer.File[] = [];
        for (let i = 0; i < parsedDocs.length; i++) {
          const doc = parsedDocs[i];
          if (!doc.url) {
            return res.status(400).json({ error: 'Each document must include a url.' });
          }
          const tempPath = await downloadToTempFile(doc.url, doc.originalname || `doc-${i}.jpg`);
          downloaded.push({
            fieldname: 'files[]',
            originalname: doc.originalname || `document-${i + 1}.jpg`,
            encoding: '7bit',
            mimetype: 'image/jpeg',
            size: fs.statSync(tempPath).size,
            destination: uploadDir,
            filename: path.basename(tempPath),
            path: tempPath,
            stream: undefined as any,
            buffer: undefined as any
          } as Express.Multer.File);
        }
        files = downloaded;

        (req as any)._cloudinaryUrls = parsedDocs.map((d) => d.url);
        (req as any)._cloudinaryTypes = parsedDocs.map((d) => d.type);
      }

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'At least one file must be uploaded.' });
      }

      if (!memberId || !memberName || !treatmentDate || !claimAmount) {
        return res.status(400).json({ error: 'Missing required claim details (memberId, memberName, treatmentDate, claimAmount).' });
      }

      const parsedClaimAmount = parseFloat(claimAmount);
      if (isNaN(parsedClaimAmount) || parsedClaimAmount < 500) {
        return res.status(400).json({ error: 'Claim amount must be a number and at least 500.' });
      }

      // Map document types array
      let types: string[] = [];
      const presetTypes = (req as any)._cloudinaryTypes as string[] | undefined;
      if (presetTypes && presetTypes.length) {
        types = presetTypes;
      } else if (typeof documentTypes === 'string') {
        try {
          types = JSON.parse(documentTypes);
        } catch {
          types = [documentTypes];
        }
      } else if (Array.isArray(documentTypes)) {
        types = documentTypes;
      } else {
        types = files.map((_, i) => (i === 0 ? 'prescription' : i === 1 ? 'bill' : 'supporting'));
      }

      const claimId = generateClaimId();

      // Create initial claim database entry
      const initialClaim = new Claim({
        claimId,
        memberId,
        memberName,
        treatmentDate: new Date(treatmentDate),
        claimAmount: parsedClaimAmount,
        hospitalName,
        cashlessRequest: cashlessRequest === 'true' || cashlessRequest === true,
        submittedAt: new Date(),
        status: 'processing',
        documents: files.map((f, index) => ({
          type: types[index] || 'bill',
          cloudinaryUrl: ((req as any)._cloudinaryUrls?.[index] as string) || '',
          ocrText: '',
          processingStatus: 'pending'
        })),
        finalDecision: {
          decision: 'MANUAL_REVIEW',
          approvedAmount: 0,
          rejectionReasons: [],
          deductions: [],
          confidenceScore: 0,
          decidedAt: new Date()
        },
        chatHistory: []
      });

      // Pass join date if present in request for test case wait limits
      if (req.body.memberJoinDate) {
        (initialClaim as any).memberJoinDate = new Date(req.body.memberJoinDate);
      }

      await initialClaim.save();

      // Log audit trail
      await AuditLog.create({
        claimId,
        event: 'Submitted',
        actor: req.user?.email || 'member',
        metadata: { claimAmount: parsedClaimAmount, documentsCount: files.length }
      });

      // Respond immediately with 202 Accepted
      res.status(202).json({
        claimId,
        streamUrl: `/api/claims/${claimId}/stream`
      });

      // Run claim processing pipeline asynchronously
      processClaimPipeline(initialClaim, files, req.body.previousClaimsSameDay);

    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /claims/:id/stream
 * Connect SSE stream
 */
router.get('/:id/stream', (req: Request, res: Response) => {
  const claimId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Store connection
  sseConnections.set(claimId, res);
  logger.info(`SSE: Client connected to claim stream ${claimId}`);

  req.on('close', () => {
    sseConnections.delete(claimId);
    logger.info(`SSE: Client disconnected from claim stream ${claimId}`);
  });
});

/**
 * GET /claims
 * Table claims view with filters and cursor pagination
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, decision, dateFrom, dateTo, memberId, limit = '25', cursor } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (decision) query['finalDecision.decision'] = decision;
    if (memberId) query.memberId = memberId;

    if (dateFrom || dateTo) {
      query.treatmentDate = {};
      if (dateFrom) query.treatmentDate.$gte = new Date(dateFrom as string);
      if (dateTo) query.treatmentDate.$lte = new Date(dateTo as string);
    }

    // Cursor-based pagination filter
    if (cursor) {
      query._id = { $gt: cursor };
    }

    const pageSize = parseInt(limit as string, 10);
    const claims = await Claim.find(query)
      .sort({ submittedAt: -1 })
      .limit(pageSize);

    const total = await Claim.countDocuments(query);
    const nextCursor = claims.length === pageSize ? claims[claims.length - 1]._id : null;

    // Meta summaries
    const approvedCount = await Claim.countDocuments({ 'finalDecision.decision': 'APPROVED' });
    const rejectedCount = await Claim.countDocuments({ 'finalDecision.decision': 'REJECTED' });
    const pendingCount = await Claim.countDocuments({ status: 'processing' });
    
    // Average processing time logic
    const avgClaimTime = await Claim.aggregate([
      { $match: { processingTimeMs: { $gt: 0 } } },
      { $group: { _id: null, avgTime: { $avg: '$processingTimeMs' } } }
    ]);
    const avgProcessingTimeMs = avgClaimTime[0]?.avgTime || 2800;

    return res.status(200).json({
      claims,
      total,
      nextCursor,
      meta: {
        totalApproved: approvedCount,
        totalRejected: rejectedCount,
        totalPending: pendingCount,
        avgProcessingTimeMs
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /claims/:id
 * Full Claim details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const claim = await Claim.findOne({ claimId: req.params.id });
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    return res.status(200).json(claim);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /claims/:id/decision
 * Override decision (role required: admin | reviewer)
 */
router.patch(
  '/:id/decision',
  authMiddleware(['admin', 'reviewer']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const claim = await Claim.findOne({ claimId: req.params.id });
      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      const { decision, approvedAmount, reason } = req.body;
      if (!decision || !reason || reason.length < 20) {
        return res.status(400).json({ error: 'A valid decision and a detailed reason (min 20 characters) are required.' });
      }

      const originalDecision = claim.finalDecision.decision;
      claim.finalDecision.decision = decision;
      if (approvedAmount !== undefined) {
        claim.finalDecision.approvedAmount = parseFloat(approvedAmount);
      }
      claim.finalDecision.notes = reason;
      claim.finalDecision.decidedAt = new Date();
      claim.status = 'decided';

      // Track manual override details
      claim.manualOverride = {
        overriddenBy: req.user?.email || 'reviewer',
        originalDecision,
        newDecision: decision,
        reason,
        overriddenAt: new Date()
      };

      await claim.save();

      // Write Audit Log
      const auditEntry = await AuditLog.create({
        claimId: claim.claimId,
        event: 'Manual Override',
        actor: req.user?.email || 'reviewer',
        metadata: { originalDecision, newDecision: decision, reason }
      });

      logger.info(`Claim ${claim.claimId} manually overridden to ${decision} by ${req.user?.email}`);

      return res.status(200).json({
        updatedDecision: claim.finalDecision,
        auditEntry
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Background claim execution pipeline
 */
async function processClaimPipeline(
  claim: IClaim,
  files: Express.Multer.File[],
  previousClaimsSameDay?: number
) {
  const startTime = Date.now();
  const claimId = claim.claimId;

  try {
    // -------------------------------------------------------------
    // STEP 1: Uploading documents
    // -------------------------------------------------------------
    sendSSEEvent(claimId, 'data', { step: 'uploading', status: 'start', message: 'Uploading claim files...' });
    
    const fileUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let secureUrl = '';
      
      if (claim.documents[i].cloudinaryUrl) {
        secureUrl = claim.documents[i].cloudinaryUrl;
      } else if (cloudinary && fs.existsSync(file.path)) {
        try {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'plum_opd_claims',
            resource_type: 'auto'
          });
          secureUrl = result.secure_url;
        } catch (err) {
          logger.error(`Cloudinary upload failed for ${file.originalname}, using local fallback.`, err);
        }
      }

      if (!secureUrl && fs.existsSync(file.path)) {
        secureUrl = `/uploads/${path.basename(file.path)}`;
      }

      fileUrls.push(secureUrl);
      claim.documents[i].cloudinaryUrl = secureUrl;
    }
    
    await claim.save();
    sendSSEEvent(claimId, 'data', { step: 'uploading', status: 'complete', message: 'Uploading finished.' });

    // -------------------------------------------------------------
    // STEP 2: OCR processing
    // -------------------------------------------------------------
    sendSSEEvent(claimId, 'data', { step: 'ocr', status: 'start', message: 'Extracting document texts via OCR...' });
    
    let combinedOcrText = '';
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileBuffer = fs.readFileSync(file.path);
        const text = await OcrService.extractText(fileBuffer, file.originalname);
        claim.documents[i].ocrText = text;
        claim.documents[i].processingStatus = 'ocr_done';
        combinedOcrText += `--- Document ${claim.documents[i].type.toUpperCase()} ---\n${text}\n\n`;
      } catch (err: any) {
        claim.documents[i].processingStatus = 'failed';
        logger.error(`OCR failed on document index ${i} for claim ${claimId}:`, err);
      }
      
      // Clean up temporary disk upload file
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }
    
    await claim.save();
    await AuditLog.create({ claimId, event: 'OCR Complete', actor: 'system', metadata: { textLength: combinedOcrText.length } });
    sendSSEEvent(claimId, 'data', { step: 'ocr', status: 'complete', message: 'OCR text extraction finished.' });

    // -------------------------------------------------------------
    // STEP 3: AI extraction
    // -------------------------------------------------------------
    sendSSEEvent(claimId, 'data', { step: 'extraction', status: 'start', message: 'Extracting structured data fields using AI...' });
    
    let primaryExtractedFields: any = null;
    for (let i = 0; i < claim.documents.length; i++) {
      const doc = claim.documents[i];
      if (doc.processingStatus === 'ocr_done' && doc.ocrText) {
        try {
          const parsedFields = await ExtractionService.extractFields(doc.ocrText, doc.type);
          doc.extractedFields = parsedFields;
          doc.processingStatus = 'extracted';
          
          // Use prescription as the primary source of metadata if available
          if (doc.type === 'prescription' || !primaryExtractedFields) {
            primaryExtractedFields = parsedFields;
          }
        } catch (err: any) {
          doc.processingStatus = 'failed';
          logger.error(`LLM extraction failed on document index ${i} for claim ${claimId}:`, err);
        }
      }
    }

    // Map extracted metadata to claim fields
    if (primaryExtractedFields) {
      claim.extractedSummary = {
        diagnosis: primaryExtractedFields.diagnosis?.value || primaryExtractedFields.diagnosis || '',
        doctorName: primaryExtractedFields.doctor_name?.value || primaryExtractedFields.doctor_name || '',
        doctorReg: primaryExtractedFields.doctor_registration?.value || primaryExtractedFields.doctor_registration || '',
        totalBilledAmount: primaryExtractedFields.total_amount?.value || primaryExtractedFields.total_amount || 0,
        itemizedCosts: (primaryExtractedFields.itemized_costs || []).map((c: any) => ({
          item: c.item || c.name || 'Unspecified fee',
          amount: c.amount || 0,
          category: c.category || 'other'
        }))
      };
    }

    await claim.save();
    await AuditLog.create({ claimId, event: 'Extraction Complete', actor: 'system', metadata: { diagnosis: claim.extractedSummary?.diagnosis } });
    sendSSEEvent(claimId, 'data', { step: 'extraction', status: 'complete', message: 'AI field extraction finished.' });

    // -------------------------------------------------------------
    // STEP 4: Running adjudication
    // -------------------------------------------------------------
    sendSSEEvent(claimId, 'data', { step: 'adjudication', status: 'start', message: 'Running rules engine and AI decision checks...' });
    
    // 1. Programmatic Rule Engine
    const ruleResult = await AdjudicationService.runRuleEngine(claim, primaryExtractedFields, previousClaimsSameDay);
    claim.ruleEngineResult = ruleResult;
    
    // Log rules check audit event
    await AuditLog.create({
      claimId,
      event: 'Rule Check',
      actor: 'system',
      metadata: { hardReject: ruleResult.hardReject, reasons: ruleResult.reasons }
    });

    // 2. AI Adjudicator Recommendation
    const aiResult = await AdjudicationService.runAIDecision(claim, primaryExtractedFields, ruleResult.ruleResults);
    claim.aiDecisionResult = aiResult;
    
    await AuditLog.create({
      claimId,
      event: 'AI Decision',
      actor: 'system',
      metadata: { aiRecommendation: aiResult.recommendation, confidence: aiResult.confidence }
    });

    // 3. Fusion Logic
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
    
    // 4. Index text chunks into Vector store for RAG chat
    try {
      await RAGService.indexClaimDocument(claimId, 'combined', combinedOcrText);
    } catch (ragErr) {
      logger.error(`RAG indexing failed for claim ${claimId}:`, ragErr);
    }

    // Set processing metrics
    const duration = Date.now() - startTime;
    claim.processingTimeMs = duration;
    
    await claim.save();

    await AuditLog.create({
      claimId,
      event: 'Final Decision',
      actor: 'system',
      metadata: { decision: fused.decision, approvedAmount: fused.approvedAmount }
    });

    // Emit final event with decision details to client
    sendSSEEvent(claimId, 'final', {
      decision: claim.finalDecision,
      claimId
    });

    logger.info(`Claim adjudication complete: ${claimId}. Decision: ${fused.decision} (Amount: ₹${fused.approvedAmount}). Time: ${duration}ms`);

  } catch (err: any) {
    logger.error(`Claim processing crashed for claim ${claimId}:`, err);
    sendSSEEvent(claimId, 'data', { step: 'adjudication', status: 'error', message: err.message });
    
    claim.status = 'closed';
    await claim.save();
  }
}

export default router;
