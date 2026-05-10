import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certification: { type: mongoose.Schema.Types.ObjectId, ref: 'Certification', required: true, index: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    title: { type: String, required: true },
    certificateId: { type: String, trim: true, index: true },
    issueDate: Date,
    fileUrl: String,
    filePath: String,
    originalName: String,
    qrData: { type: mongoose.Schema.Types.Mixed },
    ocrText: String,
    textFingerprint: String,
    imageHash: { type: String, index: true },
    // New detailed extracted certificate data captured from AI pipeline
    extractedCertificateData: { type: mongoose.Schema.Types.Mixed, default: {} },
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
    analysis: { type: mongoose.Schema.Types.Mixed, default: {} },

    // New comprehensive AI analysis structure
    aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

certificateSchema.index({ organization: 1, certificateId: 1 });
certificateSchema.index({ organization: 1, issueDate: 1 });
certificateSchema.index({ status: 1, locked: 1, createdAt: -1 });

export default mongoose.model('Certificate', certificateSchema);
