import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isDemoMode } from '../config/db.js';
import User from '../models/User.js';
import { demoStore } from '../services/demoStore.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const signToken = (user) =>
  jwt.sign(
    { id: user._id?.toString?.() || user.id, role: user.role },
    process.env.JWT_SECRET || 'quickcheck-local-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const sanitizeUser = (user) => {
  const plain = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  delete plain.password;
  return plain;
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, department, rollNumber, graduationYear } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, 'Name, email, and password are required');
  }

  if (isDemoMode()) {
    if (demoStore.findUserByEmail(email)) {
      throw new ApiError(409, 'A user with this email already exists');
    }

    const user = await demoStore.createStudent({ name, email, password, department, rollNumber, graduationYear });
    res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
    return;
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists');
  }

  const user = await User.create({
    name,
    email,
    password,
    department,
    rollNumber,
    graduationYear,
    role: 'STUDENT'
  });

  res.status(201).json({ token: signToken(user), user: sanitizeUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  if (isDemoMode()) {
    const user = demoStore.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(401, 'Invalid email or password');
    }
    res.json({ token: signToken(user), user: sanitizeUser(user) });
    return;
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  res.json({ token: signToken(user), user: sanitizeUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

