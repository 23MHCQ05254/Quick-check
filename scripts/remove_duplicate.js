#!/usr/bin/env node
/**
 * Remove a duplicate certificate by ID
 * Soft-deletes the record and removes the physical file
 * Usage: node scripts/remove_duplicate.js <certificate-id>
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Certificate from '../backend/src/models/Certificate.js';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickcheck';
const certId = process.argv[2];

if (!certId) {
  console.error('Usage: node scripts/remove_duplicate.js <certificate-id>');
  console.error('Example: node scripts/remove_duplicate.js 6a020e62af8296ad270e196c');
  process.exit(1);
}

async function removeDuplicate() {
  try {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');

    // Find the certificate
    const certificate = await Certificate.findById(certId);
    if (!certificate) {
      console.error(`✗ Certificate not found: ${certId}`);
      process.exit(1);
    }

    console.log('Duplicate Certificate Details:');
    console.log(`  ID: ${certificate._id}`);
    console.log(`  Title: ${certificate.title}`);
    console.log(`  File: ${certificate.originalName}`);
    console.log(`  File path: ${certificate.filePath}`);
    console.log(`  Status: ${certificate.status}\n`);

    // Confirm deletion
    const confirm = process.env.CONFIRM_DELETE === 'YES';
    if (!confirm) {
      console.log('⚠ To actually delete, set environment variable: CONFIRM_DELETE=YES');
      console.log(`  Example: CONFIRM_DELETE=YES node scripts/remove_duplicate.js ${certId}\n`);
      process.exit(0);
    }

    // Soft-delete in MongoDB (mark as deleted)
    const updated = await Certificate.findByIdAndUpdate(
      certId,
      {
        status: 'REJECTED',
        'moderation.deletedAt': new Date(),
        'moderation.deletedBy': null  // system deletion
      },
      { new: true }
    );

    console.log('✓ Marked as deleted in database');

    // Delete physical file if it exists
    if (certificate.filePath && fs.existsSync(certificate.filePath)) {
      try {
        fs.unlinkSync(certificate.filePath);
        console.log(`✓ Removed file: ${certificate.filePath}`);
      } catch (err) {
        console.warn(`⚠ Could not delete file: ${err.message}`);
      }
    } else {
      console.log(`⚠ File not found: ${certificate.filePath}`);
    }

    console.log('\n✓ Duplicate certificate removed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

removeDuplicate();
