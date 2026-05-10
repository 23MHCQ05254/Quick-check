#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Certification from '../models/Certification.js';
import { connectDatabase } from '../config/db.js';

dotenv.config();

const certifications = [
    {
        organizationName: 'MongoDB',
        certificationName: 'MongoDB Associate Developer',
        level: 'Associate',
        skills: ['Database Design', 'CRUD Operations', 'Indexing', 'Aggregation']
    },
    {
        organizationName: 'GitHub',
        certificationName: 'GitHub Foundations',
        level: 'Foundations',
        skills: ['Version Control', 'Collaboration', 'CI/CD', 'Git Workflows']
    },
    {
        organizationName: 'Amazon Web Services',
        certificationName: 'AWS Solutions Architect Associate',
        level: 'Associate',
        skills: ['EC2', 'S3', 'RDS', 'IAM', 'VPC', 'CloudFormation']
    }
];

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('[seedCertifications] MONGODB_URI not configured. Aborting.');
        process.exit(1);
    }

    await connectDatabase();

    try {
        for (const cert of certifications) {
            // Find or create organization
            const org = await Organization.findOneAndUpdate(
                { name: cert.organizationName },
                {
                    name: cert.organizationName,
                    slug: cert.organizationName.toLowerCase().replace(/\s+/g, '-'),
                    active: true
                },
                { upsert: true, new: true }
            );

            // Find or create certification
            const certification = await Certification.findOneAndUpdate(
                { organization: org._id, name: cert.certificationName },
                {
                    organization: org._id,
                    name: cert.certificationName,
                    slug: cert.certificationName.toLowerCase().replace(/\s+/g, '-'),
                    level: cert.level,
                    skills: cert.skills,
                    active: true
                },
                { upsert: true, new: true }
            );

            console.log(`[seedCertifications] ✓ Created/Updated: ${cert.organizationName} - ${cert.certificationName}`);
        }

        console.log('[seedCertifications] Certification seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('[seedCertifications] Error seeding certifications:', err);
        process.exit(2);
    }
};

run();
