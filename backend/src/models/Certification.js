import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, index: true },
    description: { type: String, trim: true, maxlength: 1200 },
    level: { type: String, enum: ['FOUNDATIONAL', 'ASSOCIATE', 'PROFESSIONAL', 'SPECIALTY'], default: 'ASSOCIATE' },
    difficultyLevel: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      default: 'INTERMEDIATE',
      index: true
    },
    category: {
      type: String,
      enum: ['DATABASE', 'CLOUD', 'NETWORKING', 'DATA', 'SECURITY', 'DEVELOPER_TOOLS', 'BUSINESS', 'OTHER'],
      default: 'OTHER',
      index: true
    },
    verificationType: {
      type: String,
      enum: ['OCR_QR', 'TEMPLATE_MATCH', 'HYBRID_AI', 'MANUAL_REVIEW'],
      default: 'HYBRID_AI',
      index: true
    },
    logoUrl: String,
    skills: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
    templateStatus: {
      type: String,
      enum: ['NOT_TRAINED', 'TRAINING', 'ACTIVE', 'RETIRED'],
      default: 'NOT_TRAINED',
      index: true
    },
    metadata: {
      expectedIssuerText: [String],
      certificateIdLabels: [String],
      validityMonths: Number
    }
  },
  { timestamps: true }
);

certificationSchema.index({ organization: 1, slug: 1 }, { unique: true });
certificationSchema.index({ name: 'text', description: 'text', skills: 'text', category: 'text' });
certificationSchema.index({ active: 1, category: 1, difficultyLevel: 1, verificationType: 1, templateStatus: 1 });

export default mongoose.model('Certification', certificationSchema);
