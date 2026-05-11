#!/usr/bin/env node

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import slugify from 'slugify';
import Organization from '../models/Organization.js';
import Certification from '../models/Certification.js';
import { connectDatabase } from '../config/db.js';

dotenv.config();

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

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('[seedCertifications] MONGODB_URI not configured. Aborting.');
        process.exit(1);
    }

    await connectDatabase();

    try {
        for (const cert of certifications) {
            // Find or create organization
            const orgSlug = slugify(cert.organizationName, { lower: true, strict: true });
            const org = await Organization.findOneAndUpdate(
                { slug: orgSlug },
                {
                    name: cert.organizationName,
                    slug: orgSlug,
                    active: true
                },
                { upsert: true, new: true }
            );

            // Find or create certification
            const certSlug = slugify(cert.certificationName, { lower: true, strict: true });
            const certification = await Certification.findOneAndUpdate(
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

            console.log(`[seedCertifications] ✓ Created/Updated: ${cert.organizationName} - ${cert.certificationName} (ID: ${certification._id})`);
        }

        console.log('[seedCertifications] Certification seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('[seedCertifications] Error seeding certifications:', err);
        process.exit(2);
    }
};

run();
