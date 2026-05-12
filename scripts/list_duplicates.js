#!/usr/bin/env node
/**
 * List all duplicate certificates in MongoDB
 * Usage: node scripts/list_duplicates.js
 */

import mongoose from 'mongoose';
import Certificate from '../backend/src/models/Certificate.js';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/quickcheck';

async function listDuplicates() {
  try {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB\n');

    // Find all certificates that have duplicateOf set
    const duplicates = await Certificate.find({ duplicateOf: { $exists: true, $ne: null } })
      .populate('student', 'name email')
      .populate('certification', 'name')
      .populate('organization', 'name')
      .sort({ createdAt: -1 });

    if (!duplicates.length) {
      console.log('No duplicate records found.');
      process.exit(0);
    }

    console.log(`Found ${duplicates.length} duplicate certificate(s):\n`);
    console.log('═'.repeat(100));

    duplicates.forEach((cert, idx) => {
      console.log(`\n[${idx + 1}] Certificate ID: ${cert._id}`);
      console.log(`    Title: ${cert.title}`);
      console.log(`    Student: ${cert.student?.name || 'N/A'} (${cert.student?.email || 'N/A'})`);
      console.log(`    Certification: ${cert.certification?.name || 'N/A'}`);
      console.log(`    Organization: ${cert.organization?.name || 'N/A'}`);
      console.log(`    Uploaded: ${cert.createdAt?.toLocaleString() || 'N/A'}`);
      console.log(`    File: ${cert.originalName}`);
      console.log(`    Status: ${cert.status}`);
      console.log(`    Duplicate of: ${cert.duplicateOf}`);
      console.log(`    File path: ${cert.filePath}`);
    });

    console.log('\n' + '═'.repeat(100));
    console.log(`\nTo remove a duplicate certificate, run:`);
    console.log(`  node scripts/remove_duplicate.js <certificate-id>\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

listDuplicates();
