import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, index: true },
    level: { type: String, enum: ['FOUNDATIONAL', 'ASSOCIATE', 'PROFESSIONAL', 'SPECIALTY'], default: 'ASSOCIATE' },
    skills: [{ type: String, trim: true }],
    active: { type: Boolean, default: true },
    metadata: {
      expectedIssuerText: [String],
      certificateIdLabels: [String],
      validityMonths: Number
    }
  },
  { timestamps: true }
);

certificationSchema.index({ organization: 1, slug: 1 }, { unique: true });

export default mongoose.model('Certification', certificationSchema);

