import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 800 },
    category: {
      type: String,
      enum: ['DATABASE', 'CLOUD', 'NETWORKING', 'DATA', 'SECURITY', 'DEVELOPER_TOOLS', 'BUSINESS', 'OTHER'],
      default: 'OTHER',
      index: true
    },
    website: String,
    logoUrl: String,
    brandColor: { type: String, default: '#38D5FF' },
    riskWeight: { type: Number, default: 1 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

organizationSchema.index({ name: 'text', description: 'text', category: 'text' });
organizationSchema.index({ active: 1, category: 1, name: 1 });

export default mongoose.model('Organization', organizationSchema);
