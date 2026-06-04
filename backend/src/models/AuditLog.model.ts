import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  claimId: string;
  event: string;
  actor: 'system' | string;
  metadata: Record<string, any>;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    claimId: { type: String, required: true, index: true },
    event: { type: String, required: true },
    actor: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    timestamp: { type: Date, default: Date.now }
  }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
