import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isDemoMode } from '../config/db.js';
import User from '../models/User.js';
import { demoStore } from '../services/dataAdapter.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const normalizeRole = (role) => String(role || '').toUpperCase();

const signToken = (user) =>
  jwt.sign(
    { id: user._id?.toString?.() || user.id, role: normalizeRole(user.role), email: user.email },
    process.env.JWT_SECRET || 'quickcheck-local-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const sanitizeUser = (user) => {
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete plain.password;
  plain.role = normalizeRole(plain.role);
  return plain;
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, department, rollNumber, graduationYear } = req.body;

  console.log('[auth.signup] Incoming request:', { name, email, department, rollNumber, graduationYear, hasPassword: !!password });

  if (!name || !email || !password) {
    console.error('[auth.signup] Validation failed - missing required fields:', { hasName: !!name, hasEmail: !!email, hasPassword: !!password });
    throw new ApiError(400, 'Name, email, and password are required');
  }

  console.log(`[auth.signup] Database mode: ${isDemoMode() ? 'DEMO' : 'MONGODB'}`);

  if (isDemoMode()) {
    console.warn('[auth.signup] ⚠️  RUNNING IN DEMO MODE - DATA WILL NOT PERSIST TO MONGODB');
    if (await demoStore.findUserByEmail(email)) {
      throw new ApiError(409, 'A user with this email already exists');
    }

    const user = await demoStore.createStudent({ name, email, password, department, rollNumber, graduationYear });
    console.log('[auth.signup] Demo user created:', { id: user.id, email: user.email, role: user.role });
    res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[auth.signup] Normalized email: "${normalizedEmail}" (original: "${email}")`);

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.warn(`[auth.signup] User already exists for email: ${normalizedEmail}`);
    throw new ApiError(409, 'A user with this email already exists');
  }

  try {
    console.log('[auth.signup] Creating user in MongoDB with role: STUDENT');
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      department,
      rollNumber,
      graduationYear,
      role: 'STUDENT'
    });

    console.log('[auth.signup] ✓ User created successfully:', { 
      id: user._id, 
      email: user.email, 
      role: user.role,
      passwordHash: user.password.substring(0, 30) + '...',
      timestamp: user.createdAt
    });

    const token = signToken(user);
    console.log('[auth.signup] ✓ JWT generated for new user');

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (error) {
    console.error('[auth.signup] ✗ User creation failed:', error.message);
    if (error.code === 11000) {
      throw new ApiError(409, 'A user with this email already exists');
    }
    throw error;
  }
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  console.log('[auth.login] Incoming request for email:', email);

  if (!email || !password) {
    console.error('[auth.login] Validation failed - missing credentials');
    throw new ApiError(400, 'Email and password are required');
  }

  console.log(`[auth.login] Database mode: ${isDemoMode() ? 'DEMO' : 'MONGODB'}`);

  if (isDemoMode()) {
    console.warn('[auth.login] ⚠️  RUNNING IN DEMO MODE');
    const user = await demoStore.findUserByEmail(email);
    console.log(`[auth.login] Demo user lookup for ${email}:`, user ? 'FOUND' : 'NOT FOUND');
    const matched = user && (await bcrypt.compare(password, user.password));
    console.log(`[auth.login] Bcrypt compare result for ${email}: ${Boolean(matched)}`);
    if (!user || !matched) {
      throw new ApiError(401, 'Invalid email or password');
    }
    const token = signToken(user);
    console.log(`[auth.login] ✓ JWT generated for demo user ${email}`);
    res.json({ token, user: sanitizeUser(user) });
    return;
  }

  try {
    console.log(`[auth.login] Looking up user in MongoDB with email: ${email}`);
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.warn(`[auth.login] ✗ User NOT FOUND in MongoDB for email: ${email}`);
      console.log('[auth.login] Checking all users in database for debugging...');
      const allUsers = await User.find({}).select('email');
      console.log('[auth.login] Users in database:', allUsers.map(u => u.email));
      throw new ApiError(401, 'Invalid email or password');
    }

    const detectedRole = normalizeRole(user.role);
    console.log(`[auth.login] Role detection for ${email}: raw=${user.role} normalized=${detectedRole}`);

    console.log(`[auth.login] ✓ User found in MongoDB for email: ${email}`);
    console.log(`[auth.login] User details:`, {
      id: user._id,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password,
      passwordHashPreview: user.password ? user.password.substring(0, 30) + '...' : 'MISSING'
    });

    console.log(`[auth.login] Attempting bcrypt.compare for ${email}...`);
    const valid = user && (await user.matchPassword(password));
    console.log(`[auth.login] ✓ Bcrypt compare result: ${Boolean(valid)} (${valid ? 'MATCH' : 'NO MATCH'})`);

    if (!valid) {
      console.warn(`[auth.login] ✗ Password mismatch for user ${email}`);
      throw new ApiError(401, 'Invalid email or password');
    }

    const token = signToken(user);
    console.log(`[auth.login] ✓ JWT generated for user ${email}, role=${user.role}`);
    
    res.json({ token, user: sanitizeUser(user) });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('[auth.login] ✗ Unexpected error during login:', error.message);
    throw error;
  }
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

