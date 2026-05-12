import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/db.js';
import Certification from './models/Certification.js';
import Organization from './models/Organization.js';
import slugify from 'slugify';

dotenv.config();

const PORT = Number.parseInt(process.env.PORT || '8000', 10);
const aiServicePort = () => {
  try {
    return Number.parseInt(new URL(process.env.AI_SERVICE_URL || 'http://localhost:8001').port || '8001', 10);
  } catch {
    return 8001;
  }
};

// Auto-seed certifications if they don't exist
const autoSeedCertifications = async () => {
  try {
    const count = await Certification.countDocuments();
    if (count > 0) {
      console.log(`[quickcheck] ${count} certifications already in database, skipping seed`);
      return;
    }

    console.log('[quickcheck] No certifications found, auto-seeding...');

    const certifications = [
      {
        organizationName: 'MongoDB',
        certificationName: 'MongoDB Associate Developer',
        category: 'DATABASE',
        level: 'ASSOCIATE',
        skills: ['Database Design', 'CRUD Operations', 'Indexing', 'Aggregation']
      },
      {
        organizationName: 'GitHub',
        certificationName: 'GitHub Foundations',
        category: 'DEVELOPER_TOOLS',
        level: 'FOUNDATIONAL',
        skills: ['Version Control', 'Collaboration', 'CI/CD', 'Git Workflows']
      },
      {
        organizationName: 'Amazon Web Services',
        certificationName: 'AWS Solutions Architect Associate',
        category: 'CLOUD',
        level: 'ASSOCIATE',
        skills: ['EC2', 'S3', 'RDS', 'IAM', 'VPC', 'CloudFormation']
      },
      {
        organizationName: 'Cisco',
        certificationName: 'Cisco CCNA',
        category: 'NETWORKING',
        level: 'ASSOCIATE',
        skills: ['Networking Fundamentals', 'Routing', 'Switching', 'Network Security']
      }
    ];

    for (const cert of certifications) {
      const orgSlug = slugify(cert.organizationName, { lower: true, strict: true });
      const org = await Organization.findOneAndUpdate(
        { slug: orgSlug },
        { name: cert.organizationName, slug: orgSlug, active: true },
        { upsert: true, new: true }
      );

      const certSlug = slugify(cert.certificationName, { lower: true, strict: true });
      await Certification.findOneAndUpdate(
        { organization: org._id, slug: certSlug },
        {
          organization: org._id,
          name: cert.certificationName,
          slug: certSlug,
          category: cert.category,
          level: cert.level,
          skills: cert.skills,
          active: true,
          templateStatus: 'NOT_TRAINED'
        },
        { upsert: true, new: true }
      );

      console.log(`[quickcheck] Auto-seeded: ${cert.organizationName} - ${cert.certificationName}`);
    }
  } catch (err) {
    console.error('[quickcheck] Auto-seed failed:', err.message);
  }
};

try {
  await connectDatabase();
  await autoSeedCertifications();
} catch (err) {
  console.error('[quickcheck] Failed to connect to MongoDB:', err.message);
  process.exit(1);
}

const listen = (port, attemptsLeft = 10) => {
  const server = app.listen(port, () => {
    console.log(`[quickcheck] API listening on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      const aiPort = aiServicePort();
      const nextPort = port + 1 === aiPort ? port + 2 : port + 1;
      console.warn(`[quickcheck] Port ${port} is in use, trying ${nextPort}`);
      listen(nextPort, attemptsLeft - 1);
      return;
    }

    console.error('[quickcheck] Server error:', err);
    process.exit(1);
  });

  return server;
};

listen(PORT);

process.on('uncaughtException', (err) => {
  console.error('[quickcheck] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[quickcheck] Unhandled rejection:', reason);
});
