import mongoose from 'mongoose';

const templateProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
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
    
    // Learned template payload from the AI service. Stored as Mixed so the
    // full extracted structure (components, relationships, hashes, metadata)
    // survives MongoDB persistence without schema stripping.
    extractedProfile: { type: mongoose.Schema.Types.Mixed },
    extractedTemplateData: { type: mongoose.Schema.Types.Mixed },
    learnedProfile: { type: mongoose.Schema.Types.Mixed },
    thresholds: { type: mongoose.Schema.Types.Mixed, default: {} },

    trainedSamplesCount: { type: Number, default: 0 },
    trainedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

templateProfileSchema.index({ certification: 1, status: 1 });

export default mongoose.model('TemplateProfile', templateProfileSchema);

