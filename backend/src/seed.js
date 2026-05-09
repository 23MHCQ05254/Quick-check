import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDatabase, isDemoMode } from './config/db.js';
import Certification from './models/Certification.js';
import Organization from './models/Organization.js';
import TemplateProfile from './models/TemplateProfile.js';
import User from './models/User.js';

dotenv.config();

const organizations = ['MongoDB', 'Cisco', 'AWS', 'Coursera', 'Google', 'Microsoft', 'Oracle'];

const certifications = [
  ['MongoDB', 'MongoDB Associate Developer', 'ASSOCIATE', ['MongoDB', 'Aggregation', 'Schema Design']],
  ['Cisco', 'Cisco CyberOps Associate', 'ASSOCIATE', ['SOC Monitoring', 'Networking', 'Threat Analysis']],
  ['AWS', 'AWS Certified Cloud Practitioner', 'FOUNDATIONAL', ['Cloud Foundations', 'IAM', 'Billing']],
  ['Coursera', 'Google Data Analytics Professional Certificate', 'PROFESSIONAL', ['Data Analysis', 'SQL', 'Dashboards']],
  ['Microsoft', 'Microsoft Azure Fundamentals', 'FOUNDATIONAL', ['Azure', 'Cloud Security', 'Governance']],
  ['Oracle', 'Oracle Cloud Infrastructure Foundations', 'FOUNDATIONAL', ['Oracle Cloud', 'Networking', 'Compute']]
];

await connectDatabase();

if (isDemoMode()) {
  console.log('Seed skipped: configure MONGODB_URI to seed MongoDB.');
  process.exit(0);
}

const orgMap = new Map();
for (const name of organizations) {
  const slug = slugify(name, { lower: true, strict: true });
  const org = await Organization.findOneAndUpdate({ slug }, { name, slug, active: true }, { upsert: true, new: true });
  orgMap.set(name, org);
}

for (const [orgName, certName, level, skills] of certifications) {
  const organization = orgMap.get(orgName);
  const slug = slugify(certName, { lower: true, strict: true });
  const certification = await Certification.findOneAndUpdate(
    { organization: organization._id, slug },
    { organization: organization._id, name: certName, slug, level, skills, active: true },
    { upsert: true, new: true }
  );

  const existingTemplate = await TemplateProfile.findOne({ certification: certification._id, status: 'ACTIVE' });
  if (!existingTemplate) {
    await TemplateProfile.create({
      certification: certification._id,
      organization: organization._id,
      status: 'ACTIVE',
      version: 1,
      extractedProfile: {
        resolution: { width: 1600, height: 1130, aspectRatio: 1.416 },
        dominantColors: ['#0EA5E9', '#111827', '#F8FAFC'],
        brightness: 220,
        edgeDensity: 0.18,
        textDensity: 0.3,
        metadata: { seeded: true, note: 'Replace with mentor-trained samples before production use' }
      },
      thresholds: { nameSimilarity: 78, visualSimilarity: 70, fraudReview: 65, fraudReject: 92 }
    });
  }
}

const mentorEmail = 'mentor@quickcheck.edu';
const mentor = await User.findOne({ email: mentorEmail });
if (!mentor) {
  await User.create({
    name: 'Dr. Ananya Rao',
    email: mentorEmail,
    password: await bcrypt.hash('mentor123', 12),
    role: 'MENTOR',
    department: 'Placement Cell',
    publicSlug: 'dr-ananya-rao'
  });
}

console.log('QuickCheck seed complete.');
await mongoose.disconnect();

