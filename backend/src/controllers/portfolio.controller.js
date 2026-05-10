import { isDemoMode } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import { demoStore } from '../services/dataAdapter.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const publicPortfolio = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const portfolio = await demoStore.findPortfolio(req.params.slug);
    if (!portfolio) throw new ApiError(404, 'Portfolio not found');
    res.json(portfolio);
    return;
  }

  const student = await User.findOne({ publicSlug: req.params.slug, role: 'STUDENT' });
  if (!student) throw new ApiError(404, 'Portfolio not found');

  const certificates = await Certificate.find({ student: student._id, status: 'VERIFIED' })
    .populate(['certification', 'organization'])
    .sort({ issueDate: -1 });

  res.json({ student, certificates });
});

