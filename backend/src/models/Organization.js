import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    website: String,
    logoUrl: String,
    riskWeight: { type: Number, default: 1 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.model('Organization', organizationSchema);

