#!/usr/bin/env node
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDatabase } from '../config/db.js';

dotenv.config();

const mentors = [
    {
        name: 'Mentor Admin',
        email: process.env.MENTOR_EMAIL || 'mentor@quickcheck.ai',
        password: process.env.MENTOR_PASSWORD || 'mentor123',
        role: 'MENTOR'
    }
];

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('[seedMentors] MONGODB_URI not configured in environment. Aborting.');
        process.exit(1);
    }

    await connectDatabase();

    try {
        for (const m of mentors) {
            const hashed = await bcrypt.hash(m.password, 10);

            // Use findOneAndUpdate to avoid triggering pre-save hash again and to upsert safely
            const result = await User.findOneAndUpdate(
                { email: m.email.toLowerCase() },
                {
                    name: m.name,
                    email: m.email.toLowerCase(),
                    password: hashed,
                    role: m.role,
                    publicSlug: m.email.toLowerCase().replace(/[^a-z0-9]/g, '-')
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            ).select('+password');

            console.log(`[seedMentors] Upserted mentor: ${result.email} id=${result._id}`);
            console.log(`[seedMentors] Stored password hash starts with: ${result.password?.slice(0, 6)}`);
        }
        console.log('[seedMentors] Mentor seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('[seedMentors] Error seeding mentors:', err);
        process.exit(2);
    }
};

run();
