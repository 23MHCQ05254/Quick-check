import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import User from '../models/User.js';

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

  const user = await User.findById(payload.id).select('-password');

  if (!user) {
    throw new ApiError(401, 'Authenticated user no longer exists');
  }

  const plainUser = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const userId = plainUser._id?.toString?.() || plainUser.id || payload.id;

  req.user = {
    ...plainUser,
    id: userId,
    _id: userId,
    email: plainUser.email,
    role: normalizeRole(plainUser.role)
  };

  console.log(`[auth.protect] Authenticated user id=${req.user.id} role=${req.user.role}`);
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

