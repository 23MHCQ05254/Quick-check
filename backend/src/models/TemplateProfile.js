import mongoose from 'mongoose';

const templateProfileSchema = new mongoose.Schema(
  {
    certification: { type: mongoose.Schema.Types.ObjectId, ref: 'Certification', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    status: { type: String, enum: ['DRAFT', 'ACTIVE', 'RETIRED'], default: 'ACTIVE', index: true },
    version: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    samples: [
      {
        originalName: String,
        fileUrl: String,
        imageHash: String
      }
    ],
    extractedProfile: {
      resolution: {
        width: Number,
        height: Number,
        aspectRatio: Number
      },
      dominantColors: [String],
      brightness: Number,
      edgeDensity: Number,
      textDensity: Number,
      qrRegions: [Object],
      logoRegions: [Object],
      textBlocks: [Object],
      metadata: Object
    },
    thresholds: {
      nameSimilarity: { type: Number, default: 78 },
      visualSimilarity: { type: Number, default: 70 },
      fraudReview: { type: Number, default: 65 },
      fraudReject: { type: Number, default: 92 }
    }
  },
  { timestamps: true }
);

templateProfileSchema.index({ certification: 1, status: 1 });

export default mongoose.model('TemplateProfile', templateProfileSchema);

