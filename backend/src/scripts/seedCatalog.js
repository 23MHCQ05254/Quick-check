#!/usr/bin/env node
import dotenv from 'dotenv';
import slugify from 'slugify';
import { connectDatabase } from '../config/db.js';
import CertificationCatalog from '../models/certificationCatalog.model.js';

dotenv.config();

const items = [
  {
    title: 'MongoDB Associate Developer',
    organization: 'MongoDB',
    category: 'Database',
    skills: ['Database Design', 'CRUD Operations', 'Indexing']
  },
  {
    title: 'Cisco CCNA',
    organization: 'Cisco',
    category: 'Networking',
    skills: ['Networking Fundamentals', 'Routing', 'Switching']
  },
  {
    title: 'AWS Solutions Architect Associate',
    organization: 'Amazon Web Services',
    category: 'Cloud',
    skills: ['EC2', 'S3', 'VPC']
  },
  {
    title: 'GitHub Foundations',
    organization: 'GitHub',
    category: 'Development',
    skills: ['Version Control', 'Collaboration', 'CI/CD']
  }
];

const upsertItem = async (item) => {
  const slug = slugify(item.title, { lower: true, strict: true });
  const now = new Date();
  const doc = {
    title: item.title,
    organization: item.organization,
    category: item.category,
    slug,
    skills: item.skills || [],
    active: true,
    updatedAt: now
  };

  const result = await CertificationCatalog.updateOne({ slug }, { $set: doc, $setOnInsert: { createdAt: now } }, { upsert: true });
  return { slug, result };
};

const run = async () => {
  try {
    await connectDatabase();
    for (const item of items) {
      const res = await upsertItem(item);
      console.log('[seedCatalog] upserted', res.slug, res.result.upsertedId ? 'inserted' : 'updated');
    }
    console.log('[seedCatalog] Done');
    process.exit(0);
  } catch (err) {
    console.error('[seedCatalog] Error', err);
    process.exit(1);
  }
};

await run();
