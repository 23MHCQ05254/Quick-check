#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'fs/promises';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDatabase } from '../config/db.js';
import ActivityLog from '../models/ActivityLog.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import TemplateProfile from '../models/TemplateProfile.js';
import User from '../models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const projectRoot = path.resolve(backendRoot, '..');
const aiServiceRoot = path.resolve(projectRoot, 'ai-service');

const COLLECTIONS_TO_CLEAR = [
  'activitylogs',
  'analytics',
  'analytics_cache',
  'certificateTemplates',
  'certificate_templates',
  'certificates',
  'cached_ai_analysis',
  'duplicate_hashes',
  'templateprofiles',
  'template_profiles',
  'template_analysis_logs',
  'template_components',
  'template_hashes',
  'template_relationships',
  'uploadedCertificates',
  'uploaded_certificates',
  'verificationResults',
  'verification_results',
  'ai_cache',
  'local_ai_cache'
];

const DIRECTORIES_TO_CLEAR = [
  path.join(backendRoot, 'src', 'uploads'),
  path.join(backendRoot, 'src', 'temp'),
  path.join(backendRoot, 'src', 'cache'),
  path.join(backendRoot, 'src', 'generated'),
  path.join(projectRoot, 'temp'),
  path.join(projectRoot, 'cache'),
  path.join(projectRoot, 'generated'),
  path.join(projectRoot, 'reports'),
  path.join(aiServiceRoot, 'templates'),
  path.join(aiServiceRoot, 'temp'),
  path.join(aiServiceRoot, 'cache'),
  path.join(aiServiceRoot, 'generated')
];

const KEEP_FILES = new Set(['.gitkeep', '.gitignore']);

const clearDirectoryContents = async (directoryPath) => {
  try {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });
    let removedCount = 0;

    for (const entry of entries) {
      if (KEEP_FILES.has(entry.name)) {
        continue;
      }

      await fs.rm(path.join(directoryPath, entry.name), { recursive: true, force: true });
      removedCount += 1;
    }

    return { removedCount, skipped: false };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { removedCount: 0, skipped: true };
    }

    throw error;
  }
};

const clearCollection = async (db, collectionName) => {
  const collectionNames = new Set((await db.listCollections().toArray()).map((collection) => collection.name));
  if (!collectionNames.has(collectionName)) {
    return { collectionName, deletedCount: 0, skipped: true };
  }

  const result = await db.collection(collectionName).deleteMany({});
  return { collectionName, deletedCount: result.deletedCount || 0, skipped: false };
};

const run = async () => {
  try {
    await connectDatabase();
    const db = mongoose.connection.db;

    const collectionLogs = [];
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      collectionLogs.push(await clearCollection(db, collectionName));
    }

    const mongoWrites = await Promise.all([
      Certificate.deleteMany({}),
      ActivityLog.deleteMany({}),
      TemplateProfile.deleteMany({}),
      User.updateMany(
        {},
        {
          $set: { notifications: [] },
          $unset: { placementReadiness: '', skillScore: '' }
        }
      ),
      Certification.updateMany({}, { $set: { templateStatus: 'NOT_TRAINED' } })
    ]);

    const directoryLogs = [];
    for (const directoryPath of DIRECTORIES_TO_CLEAR) {
      directoryLogs.push({ directoryPath, ...(await clearDirectoryContents(directoryPath)) });
    }

    console.log('[quickcheck-reset] MongoDB collections cleared:');
    collectionLogs.forEach((entry) => {
      const state = entry.skipped ? 'skipped' : `deleted ${entry.deletedCount}`;
      console.log(`  - ${entry.collectionName}: ${state}`);
    });

    console.log('[quickcheck-reset] Document resets applied:');
    console.log(`  - certificates: ${mongoWrites[0].deletedCount || 0}`);
    console.log(`  - activity logs: ${mongoWrites[1].deletedCount || 0}`);
    console.log(`  - template profiles: ${mongoWrites[2].deletedCount || 0}`);
    console.log(`  - user stats reset: ${mongoWrites[3].modifiedCount || 0}`);
    console.log(`  - certification template status reset: ${mongoWrites[4].modifiedCount || 0}`);

    console.log('[quickcheck-reset] Filesystem cleanup:');
    directoryLogs.forEach((entry) => {
      const state = entry.skipped ? 'skipped' : `removed ${entry.removedCount} item(s)`;
      console.log(`  - ${entry.directoryPath}: ${state}`);
    });

    console.log('[quickcheck-reset] Development reset complete.');
  } catch (error) {
    console.error('[quickcheck-reset] Reset failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await run();