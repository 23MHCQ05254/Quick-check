import mongoose from 'mongoose';

const certificationCatalogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    organization: { type: String, required: true, trim: true, index: true },
    category: { type: String, trim: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    skills: [{ type: String, trim: true }],
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

export default mongoose.model('CertificationCatalog', certificationCatalogSchema);
