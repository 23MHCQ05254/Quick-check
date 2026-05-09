import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: ['STUDENT', 'MENTOR'], required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    severity: { type: String, enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'INFO', index: true },
    message: { type: String, required: true },
    metadata: Object,
    ipAddress: String,
    userAgent: String
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1, severity: 1 });

export default mongoose.model('ActivityLog', activityLogSchema);

