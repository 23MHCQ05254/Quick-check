import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certification: { type: mongoose.Schema.Types.ObjectId, ref: 'Certification', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true },
    certificateId: { type: String, trim: true, index: true },
    issueDate: Date,
    fileUrl: String,
    filePath: String,
    originalName: String,
    qrData: String,
    ocrText: String,
    textFingerprint: String,
    imageHash: { type: String, index: true },
    // New detailed extracted certificate data captured from AI pipeline
    extractedCertificateData: {
      ocrBlocks: [Object],
      textCoordinates: [Object],
      qrData: [Object],
      logoRegions: [Object],
      signatureRegions: [Object],
      colorProfiles: [Object],
      fontMetadata: [Object],
      spacingPatterns: [Object],
      layoutVectors: [Object],
      imageHashes: [String],
      securityMarkers: [Object],
      visualFingerprint: Object
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'],
      default: 'PENDING',
      index: true
    },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
    reviewNotes: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    locked: { type: Boolean, default: false, index: true },
    moderation: {
      overrideReason: String,
      manualReviewRequested: { type: Boolean, default: false },
      rerunCount: { type: Number, default: 0 },
      lastRerunAt: Date,
      deletedAt: Date,
      deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    // AI analysis summary (kept for backward compatibility)
    analysis: {
      fraudProbability: Number,
      confidence: Number,
      nameSimilarity: Number,
      visualSimilarity: Number,
      trustScore: Number,
      riskLevel: String,
      extractedFields: Object,
      suspiciousIndicators: [String],
      anomalies: [Object],
      recommendation: String
    },

    // New comprehensive AI analysis structure
    aiAnalysis: {
      authenticityScore: Number,
      fraudProbability: Number,
      confidenceLevel: Number,
      matchedRegions: [Object],
      mismatchedRegions: [Object],
      missingElements: [String],
      duplicateProbability: Number,
      suspiciousAreas: [Object],
      aiReasoning: [String],
      verificationStatus: { type: String, enum: ['VERIFIED', 'SUSPICIOUS', 'POSSIBLE_FORGERY', 'PENDING'], default: 'PENDING' }
    }
  },
  { timestamps: true }
);

certificateSchema.index({ organization: 1, certificateId: 1 });
certificateSchema.index({ organization: 1, issueDate: 1 });
certificateSchema.index({ status: 1, locked: 1, createdAt: -1 });

export default mongoose.model('Certificate', certificateSchema);
