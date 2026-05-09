import { isDemoMode } from '../config/db.js';
import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import { demoStore } from '../services/demoStore.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const summarize = (certificates) => {
  const totals = certificates.reduce(
    (acc, cert) => {
      acc.total += 1;
      acc[cert.status] = (acc[cert.status] || 0) + 1;
      acc.avgFraud += cert.analysis?.fraudProbability || 0;
      return acc;
    },
    { total: 0, VERIFIED: 0, PENDING: 0, REJECTED: 0, REVIEW_REQUIRED: 0, avgFraud: 0 }
  );
  totals.avgFraud = totals.total ? Math.round(totals.avgFraud / totals.total) : 0;
  return totals;
};

export const dashboard = asyncHandler(async (_req, res) => {
  if (isDemoMode()) {
    const certificates = demoStore.listAllCertificates();
    const students = demoStore.users.filter((user) => user.role === 'STUDENT');
    res.json({
      summary: { ...summarize(certificates), students: students.length },
      suspicious: certificates.filter((cert) => cert.status === 'REVIEW_REQUIRED' || (cert.analysis?.fraudProbability || 0) >= 65),
      recent: certificates.slice(0, 8)
    });
    return;
  }

  const certificates = await Certificate.find().populate(['student', 'certification', 'organization']).sort({ createdAt: -1 });
  const students = await User.countDocuments({ role: 'STUDENT' });

  res.json({
    summary: { ...summarize(certificates), students },
    suspicious: certificates.filter((cert) => cert.status === 'REVIEW_REQUIRED' || (cert.analysis?.fraudProbability || 0) >= 65),
    recent: certificates.slice(0, 8)
  });
});

export const listStudents = asyncHandler(async (_req, res) => {
  if (isDemoMode()) {
    const items = demoStore.users
      .filter((user) => user.role === 'STUDENT')
      .map((student) => ({
        ...student,
        password: undefined,
        certificates: demoStore.certificates.filter((cert) => cert.student === student._id).length,
        verified: demoStore.certificates.filter((cert) => cert.student === student._id && cert.status === 'VERIFIED').length
      }));
    res.json({ items });
    return;
  }

  const students = await User.find({ role: 'STUDENT' }).sort({ createdAt: -1 });
  const counts = await Certificate.aggregate([
    { $group: { _id: '$student', certificates: { $sum: 1 }, verified: { $sum: { $cond: [{ $eq: ['$status', 'VERIFIED'] }, 1, 0] } } } }
  ]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item]));

  res.json({
    items: students.map((student) => ({
      ...student.toJSON(),
      certificates: countMap.get(student._id.toString())?.certificates || 0,
      verified: countMap.get(student._id.toString())?.verified || 0
    }))
  });
});

export const reviewCertificate = asyncHandler(async (req, res) => {
  const { status, reviewNotes } = req.body;
  const allowed = ['PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'];
  if (!allowed.includes(status)) {
    throw new ApiError(400, 'Invalid certificate status');
  }

  if (isDemoMode()) {
    const certificate = demoStore.reviewCertificate(req.params.id, {
      status,
      reviewNotes,
      reviewedBy: req.user._id
    });
    if (!certificate) throw new ApiError(404, 'Certificate not found');
    res.json({ certificate });
    return;
  }

  const certificate = await Certificate.findByIdAndUpdate(
    req.params.id,
    { status, reviewNotes, reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  ).populate(['student', 'certification', 'organization']);

  if (!certificate) throw new ApiError(404, 'Certificate not found');
  res.json({ certificate });
});

export const analytics = asyncHandler(async (_req, res) => {
  const certificates = isDemoMode()
    ? demoStore.listAllCertificates()
    : await Certificate.find().populate(['organization', 'certification']);

  const byOrganization = certificates.reduce((acc, cert) => {
    const name = cert.organization?.name || 'Unknown';
    acc[name] = acc[name] || { organization: name, uploads: 0, avgFraud: 0 };
    acc[name].uploads += 1;
    acc[name].avgFraud += cert.analysis?.fraudProbability || 0;
    return acc;
  }, {});

  const organizationRisk = Object.values(byOrganization).map((item) => ({
    ...item,
    avgFraud: item.uploads ? Math.round(item.avgFraud / item.uploads) : 0
  }));

  res.json({
    organizationRisk,
    readinessTrend: [
      { month: 'Jan', readiness: 48, verified: 8 },
      { month: 'Feb', readiness: 54, verified: 14 },
      { month: 'Mar', readiness: 61, verified: 19 },
      { month: 'Apr', readiness: 68, verified: 28 },
      { month: 'May', readiness: 72, verified: 36 }
    ]
  });
});

