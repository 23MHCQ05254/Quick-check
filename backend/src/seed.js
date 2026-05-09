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

const organizations = [
  ['MongoDB', 'DATABASE', '#37E6A0', 'Developer data platform certifications for document databases and application data modeling.'],
  ['Cisco', 'NETWORKING', '#38D5FF', 'Networking and cybersecurity credentials for enterprise infrastructure teams.'],
  ['AWS', 'CLOUD', '#F6C667', 'Cloud computing credentials for architecture, security, operations, and foundations.'],
  ['Coursera', 'DATA', '#38D5FF', 'Professional certificate programs from universities and technology partners.'],
  ['Google', 'CLOUD', '#4285F4', 'Google Cloud, data, cybersecurity, and career certificate programs.'],
  ['Microsoft', 'CLOUD', '#7FBA00', 'Azure, security, data, and productivity certifications for enterprise teams.'],
  ['Oracle', 'CLOUD', '#FF6B8A', 'Database, Java, and Oracle Cloud Infrastructure credentials.']
];

const certifications = [
  ['MongoDB', 'MongoDB Associate Developer', 'ASSOCIATE', 'INTERMEDIATE', 'DATABASE', 'HYBRID_AI', ['MongoDB', 'Aggregation', 'Schema Design']],
  ['Cisco', 'Cisco CyberOps Associate', 'ASSOCIATE', 'INTERMEDIATE', 'SECURITY', 'OCR_QR', ['SOC Monitoring', 'Networking', 'Threat Analysis']],
  ['AWS', 'AWS Certified Cloud Practitioner', 'FOUNDATIONAL', 'BEGINNER', 'CLOUD', 'HYBRID_AI', ['Cloud Foundations', 'IAM', 'Billing']],
  ['Coursera', 'Google Data Analytics Professional Certificate', 'PROFESSIONAL', 'INTERMEDIATE', 'DATA', 'TEMPLATE_MATCH', ['Data Analysis', 'SQL', 'Dashboards']],
  ['Microsoft', 'Microsoft Azure Fundamentals', 'FOUNDATIONAL', 'BEGINNER', 'CLOUD', 'HYBRID_AI', ['Azure', 'Cloud Security', 'Governance']],
  ['Oracle', 'Oracle Cloud Infrastructure Foundations', 'FOUNDATIONAL', 'BEGINNER', 'CLOUD', 'OCR_QR', ['Oracle Cloud', 'Networking', 'Compute']]
];

await connectDatabase();

if (isDemoMode()) {
  console.log('Seed skipped: configure MONGODB_URI to seed MongoDB.');
  process.exit(0);
}

const orgMap = new Map();
for (const [name, category, brandColor, description] of organizations) {
  const slug = slugify(name, { lower: true, strict: true });
  const org = await Organization.findOneAndUpdate(
    { slug },
    { name, slug, category, brandColor, description, active: true },
    { upsert: true, new: true }
  );
  orgMap.set(name, org);
}

for (const [orgName, certName, level, difficultyLevel, category, verificationType, skills] of certifications) {
  const organization = orgMap.get(orgName);
  const slug = slugify(certName, { lower: true, strict: true });
  const certification = await Certification.findOneAndUpdate(
    { organization: organization._id, slug },
    {
      organization: organization._id,
      name: certName,
      slug,
      level,
      difficultyLevel,
      category,
      verificationType,
      skills,
      active: true,
      templateStatus: 'ACTIVE'
    },
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
