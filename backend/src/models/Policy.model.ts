import { Schema, model, Document } from 'mongoose';

export interface IPolicy extends Document {
  version: number;
  uploadedAt: Date;
  uploadedBy: string;
  isActive: boolean;
  config: Record<string, any>;
}

const PolicySchema = new Schema<IPolicy>(
  {
    version: { type: Number, required: true, unique: true },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, required: true },
    isActive: { type: Boolean, default: false, index: true },
    config: { type: Schema.Types.Mixed, required: true }
  },
  { timestamps: true }
);

export const Policy = model<IPolicy>('Policy', PolicySchema);
