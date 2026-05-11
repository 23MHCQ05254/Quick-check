#!/usr/bin/env node
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDatabase } from '../config/db.js';

dotenv.config();

const students = [
    {
        name: 'Joseph Raju Janga',
        email: 'student@quickcheck.edu',
        password: 'password123',
        role: 'STUDENT',
        department: 'Computer Science',
        rollNumber: 'QC23CS042',
        graduationYear: 2027
    }
];

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('[seedStudents] MONGODB_URI not configured in environment. Aborting.');
        process.exit(1);
    }

    await connectDatabase();

    try {
        for (const student of students) {
            const hashed = await bcrypt.hash(student.password, 10);

            // Use findOneAndUpdate to avoid triggering pre-save hash again and to upsert safely
            const result = await User.findOneAndUpdate(
                { email: student.email.toLowerCase() },
                {
                    name: student.name,
                    email: student.email.toLowerCase(),
                    password: hashed,
                    role: student.role,
                    department: student.department,
                    rollNumber: student.rollNumber,
                    graduationYear: student.graduationYear,
                    publicSlug: student.email.toLowerCase().replace(/[^a-z0-9]/g, '-')
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            ).select('+password');

            console.log(`[seedStudents] Upserted student: ${result.email} id=${result._id}`);
            console.log(`[seedStudents] Stored password hash starts with: ${result.password?.slice(0, 6)}`);
        }
        console.log('[seedStudents] Student seeding complete.');
        process.exit(0);
    } catch (err) {
        console.error('[seedStudents] Error seeding students:', err);
        process.exit(1);
    }
};

await run();