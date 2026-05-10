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
    // legacy extractedProfile kept for backward compatibility
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

    // New comprehensive template data produced by AI training
    extractedTemplateData: {
      ocrBlocks: [Object],
      textCoordinates: [Object],
      qrData: [Object],
      qrCoordinates: [Object],
      logoHashes: [String],
      signatureRegions: [Object],
      colorProfiles: [Object],
      fontMetadata: [Object],
      spacingPatterns: [Object],
      layoutVectors: [Object],
      imageHashes: [String],
      securityMarkers: [Object],
      visualFingerprint: Object,
      averageTemplateScore: { type: Number, default: null }
    },
    thresholds: {
      // thresholds are advisory and should be computed by AI; defaults removed to avoid hardcoding
      nameSimilarity: { type: Number },
      visualSimilarity: { type: Number },
      fraudReview: { type: Number },
      fraudReject: { type: Number }
    },

    trainedSamplesCount: { type: Number, default: 0 },
    trainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

templateProfileSchema.index({ certification: 1, status: 1 });

export default mongoose.model('TemplateProfile', templateProfileSchema);

