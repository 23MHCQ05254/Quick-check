import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { isDemoMode } from '../config/db.js';
import User from '../models/User.js';
import { demoStore } from '../services/dataAdapter.js';

const normalizeRole = (role) => String(role || '').toUpperCase();

export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Authentication token is required');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || 'quickcheck-local-secret-change-me');
  } catch (_error) {
    throw new ApiError(401, 'Invalid or expired authentication token');
  }

  const user = isDemoMode()
    ? await demoStore.findUserById(payload.id)
    : await User.findById(payload.id).select('-password');

  if (!user) {
    throw new ApiError(401, 'Authenticated user no longer exists');
  }

  req.user = {
    ...(typeof user.toJSON === 'function' ? user.toJSON() : user),
    role: normalizeRole(user.role)
  };

  console.log(`[auth.protect] Authenticated user id=${req.user._id || req.user.id} role=${req.user.role}`);
  next();
});

export const requireRole = (...roles) => (req, _res, next) => {
  const normalizedRoles = roles.map(normalizeRole);
  const actualRole = normalizeRole(req.user.role);

  if (!normalizedRoles.includes(actualRole)) {
    console.log(`[auth] Role validation failed. Required=${roles.join(',')} got=${req.user.role}`);
    next(new ApiError(403, 'You do not have permission to perform this action'));
    return;
  }
  next();
};

export const mentorOnly = requireRole('MENTOR');
export const studentOnly = requireRole('STUDENT');

