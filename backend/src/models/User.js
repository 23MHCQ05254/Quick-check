import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import slugify from 'slugify';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['STUDENT', 'MENTOR'], default: 'STUDENT', index: true },
    department: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    graduationYear: Number,
    publicSlug: { type: String, unique: true, sparse: true },
    skills: [{ type: String, trim: true }],
    skillScore: { type: Number, default: 42 },
    placementReadiness: { type: Number, default: 38 },
    notifications: [
      {
        title: String,
        body: String,
        read: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.publicSlug) {
    this.publicSlug = `${slugify(this.name, { lower: true, strict: true })}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  }

  if (!this.isModified('password')) {
    next();
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function matchPassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('User', userSchema);

