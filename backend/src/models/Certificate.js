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
    analysis: {
      fraudProbability: Number,
      confidence: Number,
      nameSimilarity: Number,
      visualSimilarity: Number,
      extractedFields: Object,
      suspiciousIndicators: [String],
      anomalies: [Object],
      recommendation: String
    }
  },
  { timestamps: true }
);

certificateSchema.index({ organization: 1, certificateId: 1 });
certificateSchema.index({ organization: 1, issueDate: 1 });

export default mongoose.model('Certificate', certificateSchema);

