import { isDemoMode } from '../config/db.js';
import ActivityLog from '../models/ActivityLog.js';
import Certificate from '../models/Certificate.js';
import Certification from '../models/Certification.js';
import Organization from '../models/Organization.js';
import TemplateProfile from '../models/TemplateProfile.js';
import User from '../models/User.js';
import { analyzeCertificateWithAi } from '../services/ai.service.js';
import { recordActivity } from '../services/activity.service.js';
import { demoStore } from '../services/dataAdapter.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parsePagination, regexSearch } from '../utils/catalog.js';

const riskLevel = (score = 0) => {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
};

const certificateRisk = (certificate) => certificate.analysis?.fraudProbability || 0;

const summarize = (certificates, students = []) => {
  const totals = certificates.reduce(
    (acc, cert) => {
      acc.total += 1;
      acc[cert.status] = (acc[cert.status] || 0) + 1;
      acc.avgFraud += certificateRisk(cert);
      acc.avgConfidence += cert.analysis?.confidence || 0;
      return acc;
    },
    {
      total: 0,
      VERIFIED: 0,
      PENDING: 0,
      REJECTED: 0,
      REVIEW_REQUIRED: 0,
      avgFraud: 0,
      avgConfidence: 0,
      students: students.length,
      avgPlacementReadiness: 0
    }
  );

  totals.avgFraud = totals.total ? Math.round(totals.avgFraud / totals.total) : 0;
  totals.avgConfidence = totals.total ? Math.round(totals.avgConfidence / totals.total) : 0;
  totals.suspicious = certificates.filter((cert) => cert.status === 'REVIEW_REQUIRED' || certificateRisk(cert) >= 65).length;
  totals.avgPlacementReadiness = students.length
    ? Math.round(students.reduce((sum, student) => sum + (student.placementReadiness || 0), 0) / students.length)
    : 0;
  return totals;
};

const monthKey = (date) => {
  const value = new Date(date || Date.now());
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
};

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

const recentMonthKeys = (count = 6) => {
  const now = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return monthKey(date);
  });
};

const zeroMonthlyTrend = () => recentMonthKeys().map((key) => ({
  key,
  month: monthLabel(key),
  uploads: 0,
  suspicious: 0,
  verified: 0,
  rejected: 0,
  avgRisk: 0
}));

const trendFromCertificates = (certificates) => {
  if (!certificates.length) {
    return zeroMonthlyTrend();
  }

  const seed = recentMonthKeys().map((key) => ({
    key,
    month: monthLabel(key),
    uploads: 0,
    suspicious: 0,
    verified: 0,
    rejected: 0,
    avgRisk: 0,
    riskTotal: 0
  }));
  const map = new Map(seed.map((item) => [item.key, item]));

  certificates.forEach((certificate) => {
    const bucket = map.get(monthKey(certificate.createdAt)) || seed[seed.length - 1];
    bucket.uploads += 1;
    bucket.verified += certificate.status === 'VERIFIED' ? 1 : 0;
    bucket.rejected += certificate.status === 'REJECTED' ? 1 : 0;
    bucket.suspicious += certificate.status === 'REVIEW_REQUIRED' || certificateRisk(certificate) >= 65 ? 1 : 0;
    bucket.riskTotal += certificateRisk(certificate);
    bucket.avgRisk = Math.round(bucket.riskTotal / Math.max(1, bucket.uploads));
  });

  return seed.map(({ riskTotal, ...item }) => item);
};

const statusDistribution = (certificates) => ['VERIFIED', 'REJECTED', 'PENDING', 'REVIEW_REQUIRED'].map((status) => ({
  status,
  count: certificates.filter((certificate) => certificate.status === status).length
}));

const riskDistribution = (certificates) => ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => ({
  level,
  count: certificates.filter((certificate) => riskLevel(certificateRisk(certificate)) === level).length
}));

const organizationStats = (certificates) => {
  const byOrganization = certificates.reduce((acc, cert) => {
    const name = cert.organization?.name || 'Unknown';
    acc[name] = acc[name] || { organization: name, uploads: 0, verified: 0, suspicious: 0, avgFraud: 0 };
    acc[name].uploads += 1;
    acc[name].verified += cert.status === 'VERIFIED' ? 1 : 0;
    acc[name].suspicious += cert.status === 'REVIEW_REQUIRED' || certificateRisk(cert) >= 65 ? 1 : 0;
    acc[name].avgFraud += certificateRisk(cert);
    return acc;
  }, {});

  return Object.values(byOrganization).map((item) => ({
    ...item,
    avgFraud: item.uploads ? Math.round(item.avgFraud / item.uploads) : 0
  }));
};

const departmentStats = (students, certificates) => {
  const byDepartment = students.reduce((acc, student) => {
    const department = student.department || 'Unassigned';
    acc[department] = acc[department] || {
      department,
      students: 0,
      uploads: 0,
      verified: 0,
      avgReadiness: 0,
      avgRisk: 0
    };
    acc[department].students += 1;
    acc[department].avgReadiness += student.placementReadiness || 0;
    return acc;
  }, {});

  certificates.forEach((certificate) => {
    const student = certificate.student && typeof certificate.student === 'object' ? certificate.student : students.find((item) => item._id?.toString?.() === certificate.student?.toString?.());
    const department = student?.department || 'Unassigned';
    byDepartment[department] = byDepartment[department] || { department, students: 0, uploads: 0, verified: 0, avgReadiness: 0, avgRisk: 0 };
    byDepartment[department].uploads += 1;
    byDepartment[department].verified += certificate.status === 'VERIFIED' ? 1 : 0;
    byDepartment[department].avgRisk += certificateRisk(certificate);
  });

  return Object.values(byDepartment).map((item) => ({
    ...item,
    avgReadiness: item.students ? Math.round(item.avgReadiness / item.students) : 0,
    avgRisk: item.uploads ? Math.round(item.avgRisk / item.uploads) : 0
  }));
};

const buildNotifications = (certificates) =>
  certificates
    .filter((certificate) => certificate.status === 'REVIEW_REQUIRED' || certificateRisk(certificate) >= 65 || certificate.duplicateOf)
    .slice(0, 12)
    .map((certificate) => ({
      id: certificate._id || certificate.id,
      type: certificate.duplicateOf ? 'duplicate_detected' : certificateRisk(certificate) >= 65 ? 'fraud_alert' : 'review_request',
      priority: certificateRisk(certificate) >= 85 ? 'CRITICAL' : certificateRisk(certificate) >= 65 ? 'HIGH' : 'MEDIUM',
      title: certificate.duplicateOf ? 'Duplicate evidence detected' : 'Certificate requires review',
      body: `${certificate.student?.name || 'Student'} uploaded ${certificate.title}`,
      createdAt: certificate.createdAt,
      read: false
    }));

const decorateStudent = (student, certificates) => {
  const studentId = student._id || student.id;
  const owned = certificates.filter((certificate) => {
    const certificateStudent = certificate.student?._id || certificate.student?.id || certificate.student;
    return certificateStudent?.toString?.() === studentId?.toString?.();
  });
  const avgRisk = owned.length ? Math.round(owned.reduce((sum, cert) => sum + certificateRisk(cert), 0) / owned.length) : 0;
  const verified = owned.filter((cert) => cert.status === 'VERIFIED').length;
  const latestUpload = owned.reduce((latest, cert) => {
    const time = new Date(cert.createdAt || 0).getTime();
    return time > latest ? time : latest;
  }, 0);
  const placementReadiness = owned.length
    ? Math.round((verified / owned.length) * 70 + Math.max(0, 100 - avgRisk) * 0.3)
    : (student.placementReadiness || 0);
  return {
    ...(typeof student.toJSON === 'function' ? student.toJSON() : student),
    password: undefined,
    certificates: owned.length,
    verified,
    reviewRequired: owned.filter((cert) => cert.status === 'REVIEW_REQUIRED').length,
    fraudScore: avgRisk,
    trustScore: Math.max(0, 100 - avgRisk),
    placementReadiness,
    latestUpload: latestUpload ? new Date(latestUpload).toISOString() : null,
    certificationNames: [...new Set(owned.map((cert) => cert.certification?.name || cert.title).filter(Boolean))],
    certificateRows: owned,
    mentorStatus: avgRisk >= 65 ? 'WATCHLIST' : owned.length ? 'ACTIVE' : 'NEW'
  };
};

const getAllCertificates = async () =>
  isDemoMode()
    ? await demoStore.listAllCertificates()
    : Certificate.find({ 'moderation.deletedAt': { $exists: false } }).populate(['student', 'certification', 'organization']).sort({ createdAt: -1 });

const getAllStudents = async () =>
  isDemoMode()
    ? demoStore._inMemory.users.filter((user) => user.role === 'STUDENT').map((user) => ({ ...user, password: undefined }))
    : User.find({ role: 'STUDENT' }).sort({ createdAt: -1 });

const buildStudentDataset = async () => {
  const certificates = await getAllCertificates();
  const students = (await getAllStudents()).map((student) => decorateStudent(student, certificates));
  return { certificates, students };
};

const filterAndSortStudents = (students, queryParams = {}) => {
  let filtered = [...students];
  const search = (queryParams.search || '').toString().toLowerCase();
  const department = (queryParams.department || queryParams.branch || '').toString();
  const year = Number(queryParams.year) || null;
  const risk = (queryParams.risk || '').toString();
  const readiness = (queryParams.readiness || '').toString();
  const certification = (queryParams.certification || '').toString().toLowerCase();
  const dateFrom = queryParams.dateFrom ? new Date(queryParams.dateFrom) : null;
  const dateTo = queryParams.dateTo ? new Date(queryParams.dateTo) : null;
  const minCerts = queryParams.minCerts !== undefined && queryParams.minCerts !== '' ? Number(queryParams.minCerts) : null;
  const maxCerts = queryParams.maxCerts !== undefined && queryParams.maxCerts !== '' ? Number(queryParams.maxCerts) : null;
  const sort = (queryParams.sort || 'readiness').toString();

  filtered = filtered.filter((student) => {
    const haystack = `${student.name} ${student.email} ${student.department} ${student.branch || ''} ${(student.skills || []).join(' ')} ${(student.certificationNames || []).join(' ')}`.toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (department && student.department !== department) return false;
    if (certification && !(student.certificationNames || []).join(' ').toLowerCase().includes(certification)) return false;
    if (year && student.graduationYear !== year) return false;
    if (risk === 'high' && student.fraudScore < 65) return false;
    if (risk === 'medium' && (student.fraudScore < 35 || student.fraudScore >= 65)) return false;
    if (risk === 'low' && student.fraudScore >= 35) return false;
    if (readiness === 'ready' && (student.placementReadiness || 0) < 70) return false;
    if (readiness === 'moderate' && ((student.placementReadiness || 0) < 40 || (student.placementReadiness || 0) >= 70)) return false;
    if (readiness === 'needs-focus' && (student.placementReadiness || 0) >= 70) return false;
    if (minCerts !== null && (student.certificates || 0) < minCerts) return false;
    if (maxCerts !== null && (student.certificates || 0) > maxCerts) return false;
    if (dateFrom || dateTo) {
      const inRange = (student.certificateRows || []).some((cert) => {
        const created = new Date(cert.createdAt || 0);
        if (dateFrom && created < dateFrom) return false;
        if (dateTo) {
          const inclusiveTo = new Date(dateTo);
          inclusiveTo.setHours(23, 59, 59, 999);
          if (created > inclusiveTo) return false;
        }
        return true;
      });
      if (!inRange) return false;
    }
    return true;
  });

  const sorters = {
    readiness: (a, b) => (b.placementReadiness || 0) - (a.placementReadiness || 0),
    trust: (a, b) => (b.trustScore || 0) - (a.trustScore || 0),
    verified: (a, b) => (b.verified || 0) - (a.verified || 0),
    recent: (a, b) => new Date(b.latestUpload || 0) - new Date(a.latestUpload || 0),
    fraud: (a, b) => (b.fraudScore || 0) - (a.fraudScore || 0),
    risk: (a, b) => (b.fraudScore || 0) - (a.fraudScore || 0),
    certificates: (a, b) => (b.certificates || 0) - (a.certificates || 0),
    name: (a, b) => a.name.localeCompare(b.name)
  };
  filtered.sort(sorters[sort] || sorters.readiness);
  return filtered;
};

export const dashboard = asyncHandler(async (_req, res) => {
  const certificates = await getAllCertificates();
  const students = await getAllStudents();
  const templates = isDemoMode() ? (await demoStore.listTemplates()).filter((template) => template.status === 'ACTIVE') : await TemplateProfile.find({ status: 'ACTIVE' });

  res.json({
    summary: { ...summarize(certificates, students), activeTemplates: templates.length },
    suspicious: certificates.filter((cert) => cert.status === 'REVIEW_REQUIRED' || certificateRisk(cert) >= 65).slice(0, 8),
    recent: certificates.slice(0, 8),
    trends: trendFromCertificates(certificates),
    organizationStats: organizationStats(certificates),
    departmentStats: departmentStats(students, certificates),
    notifications: buildNotifications(certificates),
    activity: isDemoMode() ? await demoStore.listActivities({ limit: 8 }) : await ActivityLog.find().populate('actor').sort({ createdAt: -1 }).limit(8)
  });
});

export const commandCenter = asyncHandler(async (_req, res) => {
  const certificates = await getAllCertificates();
  const students = await getAllStudents();
  const templates = isDemoMode() ? (await demoStore.listTemplates()).filter((template) => template.status === 'ACTIVE') : await TemplateProfile.find({ status: 'ACTIVE' });
  const organizations = isDemoMode() ? await demoStore.listOrganizations(true) : await Organization.find({ active: true });
  const certifications = isDemoMode() ? (await demoStore.listCatalog({ limit: 48 })).items : await Certification.find({ active: true }).populate('organization').limit(80);
  const decoratedStudents = students.map((student) => decorateStudent(student, certificates));

  res.json({
    summary: { ...summarize(certificates, students), activeTemplates: templates.length, organizations: organizations.length, certifications: certifications.length },
    fraudTrends: trendFromCertificates(certificates),
    riskDistribution: riskDistribution(certificates),
    statusDistribution: statusDistribution(certificates),
    organizationStats: organizationStats(certificates),
    departmentStats: departmentStats(students, certificates),
    readinessLeaders: decoratedStudents.sort((left, right) => (right.placementReadiness || 0) - (left.placementReadiness || 0)).slice(0, 6),
    riskLeaders: certificates
      .map((certificate) => ({ ...certificate, riskLevel: riskLevel(certificateRisk(certificate)) }))
      .sort((left, right) => certificateRisk(right) - certificateRisk(left))
      .slice(0, 8),
    reviewQueue: certificates.filter((cert) => cert.status === 'REVIEW_REQUIRED' || certificateRisk(cert) >= 65).slice(0, 8),
    notifications: buildNotifications(certificates),
    activity: isDemoMode() ? await demoStore.listActivities({ limit: 12 }) : await ActivityLog.find().populate('actor').sort({ createdAt: -1 }).limit(12)
  });
});

export const listStudents = asyncHandler(async (req, res) => {
  const { students: allStudents } = await buildStudentDataset();
  const students = filterAndSortStudents(allStudents, req.query);

  res.json({
    items: students.map(({ certificateRows, ...student }) => student),
    facets: {
      departments: [...new Set(students.map((student) => student.department).filter(Boolean))],
      years: [...new Set(students.map((student) => student.graduationYear).filter(Boolean))],
      certifications: [...new Set(students.flatMap((student) => student.certificationNames || []).filter(Boolean))]
    }
  });
});

const csvEscape = (value) => {
  const text = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const exportStudents = asyncHandler(async (req, res) => {
  const { students: allStudents } = await buildStudentDataset();
  const students = filterAndSortStudents(allStudents, req.query);

  const rows = students.flatMap((student) => {
    const certRows = student.certificateRows?.length ? student.certificateRows : [null];
    return certRows.map((cert) => ({
      'student name': student.name,
      email: student.email,
      branch: student.department || student.branch || '',
      year: student.graduationYear || '',
      'certificate name': cert?.certification?.name || cert?.title || '',
      issuer: cert?.organization?.name || '',
      'upload date': cert?.createdAt ? new Date(cert.createdAt).toISOString() : '',
      'verification status': cert?.status || '',
      'fraud score': certificateRisk(cert || {}),
      'trust score': student.trustScore || 0,
      'readiness score': student.placementReadiness || 0,
      'verified cert count': student.verified || 0
    }));
  });

  const columns = Object.keys(rows[0] || {
    'student name': '', email: '', branch: '', year: '', 'certificate name': '', issuer: '', 'upload date': '',
    'verification status': '', 'fraud score': '', 'trust score': '', 'readiness score': '', 'verified cert count': ''
  });
  const format = (req.query.format || 'csv').toString().toLowerCase();

  if (format === 'xlsx') {
    const htmlRows = rows.map((row) => `<tr>${columns.map((col) => `<td>${String(row[col] ?? '').replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[ch]))}</td>`).join('')}</tr>`).join('');
    const html = `<table><thead><tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr></thead><tbody>${htmlRows}</tbody></table>`;
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', 'attachment; filename="quickcheck-filtered-students.xls"');
    res.send(html);
    return;
  }

  const csv = [columns.map(csvEscape).join(','), ...rows.map((row) => columns.map((col) => csvEscape(row[col])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="quickcheck-filtered-students.csv"');
  res.send(csv);
});

export const listReviewQueue = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const certificates = (await getAllCertificates()).filter((certificate) => certificate.status === 'REVIEW_REQUIRED' || certificateRisk(certificate) >= 65 || certificate.duplicateOf);
  const items = certificates.slice(skip, skip + limit).map((certificate) => ({
    ...certificate,
    riskLevel: riskLevel(certificateRisk(certificate)),
    aiDecision: certificateRisk(certificate) >= 85 ? 'REJECT_RECOMMENDED' : 'MANUAL_REVIEW'
  }));

  res.json({ items, pagination: { page, limit, total: certificates.length, pages: Math.max(1, Math.ceil(certificates.length / limit)) } });
});

export const listCertificates = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);

  if (isDemoMode()) {
    let items = await demoStore.listAllCertificates();
    if (req.query.status) items = items.filter((certificate) => certificate.status === req.query.status);
    if (req.query.risk === 'high') items = items.filter((certificate) => certificateRisk(certificate) >= 65);
    if (req.query.search) {
      const q = req.query.search.toString().toLowerCase();
      items = items.filter((certificate) => `${certificate.title} ${certificate.student?.name} ${certificate.organization?.name}`.toLowerCase().includes(q));
    }
    const total = items.length;
    res.json({ items: items.slice(skip, skip + limit), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
    return;
  }

  const query = { 'moderation.deletedAt': { $exists: false } };
  if (req.query.status) query.status = req.query.status;
  if (req.query.risk === 'high') query['analysis.fraudProbability'] = { $gte: 65 };
  if (req.query.risk === 'medium') query['analysis.fraudProbability'] = { $gte: 35, $lt: 65 };
  if (req.query.risk === 'low') query['analysis.fraudProbability'] = { $lt: 35 };

  const items = await Certificate.find(query).populate(['student', 'certification', 'organization']).sort({ createdAt: -1 });
  const filtered = req.query.search
    ? items.filter((certificate) => {
      const search = regexSearch(req.query.search.toString());
      return search.test(`${certificate.title} ${certificate.student?.name || ''} ${certificate.organization?.name || ''}`);
    })
    : items;

  res.json({
    items: filtered.slice(skip, skip + limit),
    pagination: { page, limit, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / limit)) }
  });
});

export const reviewCertificate = asyncHandler(async (req, res) => {
  const { status, reviewNotes, overrideReason } = req.body;
  const allowed = ['PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'];
  if (!allowed.includes(status)) {
    throw new ApiError(400, 'Invalid certificate status');
  }

  if (isDemoMode()) {
    const certificate = await demoStore.reviewCertificate(req.params.id, {
      status,
      reviewNotes,
      overrideReason,
      reviewedBy: req.user._id
    });
    if (!certificate) throw new ApiError(404, 'Certificate not found');
    res.json({ certificate });
    return;
  }

  const certificate = await Certificate.findByIdAndUpdate(
    req.params.id,
    {
      status,
      reviewNotes,
      reviewedBy: req.user._id,
      reviewedAt: new Date(),
      'moderation.overrideReason': overrideReason || reviewNotes,
      'moderation.manualReviewRequested': status === 'REVIEW_REQUIRED'
    },
    { new: true }
  ).populate(['student', 'certification', 'organization']);

  if (!certificate) throw new ApiError(404, 'Certificate not found');
  await recordActivity({
    req,
    actor: req.user,
    actorRole: 'MENTOR',
    action: `CERTIFICATE_${status}`,
    entityType: 'Certificate',
    entityId: certificate._id,
    severity: status === 'REJECTED' ? 'HIGH' : 'INFO',
    message: `${certificate.title} moved to ${status.replaceAll('_', ' ')}`,
    metadata: { reviewNotes }
  });
  res.json({ certificate });
});

export const moderateCertificate = asyncHandler(async (req, res) => {
  const allowed = ['PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED'];
  if (req.body.status && !allowed.includes(req.body.status)) throw new ApiError(400, 'Invalid certificate status');

  if (isDemoMode()) {
    const certificate = await demoStore.moderateCertificate(req.params.id, { ...req.body, actor: req.user._id });
    if (!certificate) throw new ApiError(404, 'Certificate not found');
    res.json({ certificate });
    return;
  }

  const patch = {
    ...(req.body.status ? { status: req.body.status } : {}),
    ...(req.body.locked !== undefined ? { locked: req.body.locked } : {}),
    ...(req.body.reviewNotes !== undefined ? { reviewNotes: req.body.reviewNotes } : {}),
    ...(req.body.overrideReason !== undefined ? { 'moderation.overrideReason': req.body.overrideReason } : {}),
    ...(req.body.manualReviewRequested !== undefined ? { 'moderation.manualReviewRequested': req.body.manualReviewRequested } : {})
  };

  const certificate = await Certificate.findByIdAndUpdate(req.params.id, patch, { new: true }).populate(['student', 'certification', 'organization']);
  if (!certificate) throw new ApiError(404, 'Certificate not found');
  await recordActivity({
    req,
    actor: req.user,
    actorRole: 'MENTOR',
    action: 'CERTIFICATE_MODERATED',
    entityType: 'Certificate',
    entityId: certificate._id,
    severity: certificate.status === 'REJECTED' ? 'HIGH' : 'INFO',
    message: `${certificate.title} moderation state updated`,
    metadata: patch
  });
  res.json({ certificate });
});

export const rerunAnalysis = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certificate = await demoStore.rerunCertificate(req.params.id, req.user._id);
    if (!certificate) throw new ApiError(404, 'Certificate not found');
    res.json({ certificate });
    return;
  }

  const certificate = await Certificate.findById(req.params.id).populate(['student', 'certification', 'organization']);
  if (!certificate) throw new ApiError(404, 'Certificate not found');
  if (!certificate.filePath) throw new ApiError(400, 'Certificate file is not available for rerun');

  const template = await TemplateProfile.findOne({ certification: certificate.certification._id, status: 'ACTIVE' });
  const analysis = await analyzeCertificateWithAi({
    filePath: certificate.filePath,
    studentName: certificate.student.name,
    certificateId: certificate.certificateId,
    issueDate: certificate.issueDate,
    organizationName: certificate.organization.name,
    templateProfile: template?.toJSON?.() || {}
  });

  certificate.analysis = { ...certificate.analysis, ...analysis };
  certificate.moderation = {
    ...(certificate.moderation || {}),
    rerunCount: (certificate.moderation?.rerunCount || 0) + 1,
    lastRerunAt: new Date()
  };
  await certificate.save();
  await recordActivity({
    req,
    actor: req.user,
    actorRole: 'MENTOR',
    action: 'AI_ANALYSIS_RERUN',
    entityType: 'Certificate',
    entityId: certificate._id,
    severity: 'MEDIUM',
    message: `AI analysis rerun for ${certificate.title}`,
    metadata: { fraudProbability: analysis.fraudProbability }
  });

  res.json({ certificate });
});

export const deleteCertificate = asyncHandler(async (req, res) => {
  if (isDemoMode()) {
    const certificate = await demoStore.deleteCertificate(req.params.id, req.user._id);
    if (!certificate) throw new ApiError(404, 'Certificate not found');
    res.json({ certificate });
    return;
  }

  const certificate = await Certificate.findByIdAndUpdate(
    req.params.id,
    { status: 'REJECTED', 'moderation.deletedAt': new Date(), 'moderation.deletedBy': req.user._id },
    { new: true }
  ).populate(['student', 'certification', 'organization']);
  if (!certificate) throw new ApiError(404, 'Certificate not found');
  await recordActivity({
    req,
    actor: req.user,
    actorRole: 'MENTOR',
    action: 'CERTIFICATE_ARCHIVED',
    entityType: 'Certificate',
    entityId: certificate._id,
    severity: 'HIGH',
    message: `${certificate.title} upload archived by mentor`,
    metadata: { certificateId: certificate.certificateId }
  });
  res.json({ certificate });
});

export const analytics = asyncHandler(async (_req, res) => {
  const certificates = await getAllCertificates();
  const students = (await getAllStudents()).map((student) => decorateStudent(student, certificates));
  const readinessTrend = trendFromCertificates(certificates).map((bucket) => {
    const monthCertificates = certificates.filter((certificate) => monthKey(certificate.createdAt) === bucket.key);
    const verified = monthCertificates.filter((certificate) => certificate.status === 'VERIFIED').length;
    return {
      month: bucket.month,
      readiness: monthCertificates.length ? Math.round((verified / monthCertificates.length) * 100) : 0,
      verified
    };
  });

  res.json({
    organizationRisk: organizationStats(certificates),
    uploadTrends: trendFromCertificates(certificates),
    departmentAnalytics: departmentStats(students, certificates),
    readinessTrend,
    riskDistribution: riskDistribution(certificates),
    statusDistribution: statusDistribution(certificates),
    topCertifications: Object.values(
      certificates.reduce((acc, certificate) => {
        acc[certificate.title] = acc[certificate.title] || { name: certificate.title, uploads: 0, avgRisk: 0 };
        acc[certificate.title].uploads += 1;
        acc[certificate.title].avgRisk += certificateRisk(certificate);
        return acc;
      }, {})
    )
      .map((item) => ({ ...item, avgRisk: Math.round(item.avgRisk / item.uploads) }))
      .sort((a, b) => b.uploads - a.uploads)
      .slice(0, 8)
  });
});

export const placementReadiness = asyncHandler(async (_req, res) => {
  const certificates = await getAllCertificates();
  const students = (await getAllStudents()).map((student) => decorateStudent(student, certificates));
  const departments = departmentStats(students, certificates);
  const uniqueSkills = [...new Set(students.flatMap((student) => student.skills || []).filter(Boolean))];
  const skillReadiness = certificates.length
    ? Object.values(
      students.reduce((acc, student) => {
        (student.skills || []).forEach((skill) => {
        acc[skill] = acc[skill] || { skill, students: 0, strength: 0 };
        acc[skill].students += 1;
          acc[skill].strength += student.placementReadiness || 0;
        });
        return acc;
      }, {})
    ).map((item) => ({ ...item, strength: item.students ? Math.round(item.strength / item.students) : 0 }))
    : uniqueSkills.map((skill) => ({ skill, students: students.filter((student) => (student.skills || []).includes(skill)).length, strength: 0 }));

  res.json({
    topStudents: students.sort((a, b) => (b.placementReadiness || 0) - (a.placementReadiness || 0)).slice(0, 10),
    topDepartments: departments.sort((a, b) => b.avgReadiness - a.avgReadiness),
    skillReadiness
  });
});

export const institutionalReport = asyncHandler(async (req, res) => {
  const certificates = await getAllCertificates();
  const students = (await getAllStudents()).map((student) => decorateStudent(student, certificates));
  const templates = isDemoMode() ? (await demoStore.listTemplates()).filter((template) => template.status === 'ACTIVE') : await TemplateProfile.find({ status: 'ACTIVE' }).populate(['certification', 'organization']);
  const summary = summarize(certificates, students);
  const report = {
    generatedAt: new Date().toISOString(),
    scope: 'institution',
    summary: {
      ...summary,
      activeTemplates: templates.length,
      verificationRate: summary.total ? Math.round((summary.VERIFIED / summary.total) * 100) : 0,
      rejectionRate: summary.total ? Math.round((summary.REJECTED / summary.total) * 100) : 0
    },
    trends: trendFromCertificates(certificates),
    riskDistribution: riskDistribution(certificates),
    statusDistribution: statusDistribution(certificates),
    departmentAnalytics: departmentStats(students, certificates),
    organizationAnalytics: organizationStats(certificates),
    topCertifications: Object.values(
      certificates.reduce((acc, certificate) => {
        const key = certificate.certification?._id?.toString?.() || certificate.title;
        acc[key] = acc[key] || {
          name: certificate.certification?.name || certificate.title,
          issuer: certificate.organization?.name || '',
          uploads: 0,
          verified: 0,
          rejected: 0,
          avgRisk: 0
        };
        acc[key].uploads += 1;
        acc[key].verified += certificate.status === 'VERIFIED' ? 1 : 0;
        acc[key].rejected += certificate.status === 'REJECTED' ? 1 : 0;
        acc[key].avgRisk += certificateRisk(certificate);
        return acc;
      }, {})
    ).map((item) => ({ ...item, avgRisk: item.uploads ? Math.round(item.avgRisk / item.uploads) : 0 })),
    explainability: {
      decisionSignals: ['template_text_similarity', 'visual_similarity', 'structure_similarity', 'qr_similarity', 'duplicate_probability'],
      finalVerdict: 'AI confidence >= threshold verifies; significant mismatch rejects; duplicate checks use verified certificates only',
      futureReadySignals: ['qr_verification', 'blockchain_anchor_hash', 'audit_log_id']
    }
  };

  const format = (req.query.format || 'json').toString().toLowerCase();
  if (format === 'csv') {
    const rows = [
      ['metric', 'value'],
      ['generatedAt', report.generatedAt],
      ['students', report.summary.students],
      ['uploads', report.summary.total],
      ['verified', report.summary.VERIFIED],
      ['rejected', report.summary.REJECTED],
      ['avgFraud', report.summary.avgFraud],
      ['avgConfidence', report.summary.avgConfidence],
      ['verificationRate', report.summary.verificationRate],
      ['activeTemplates', report.summary.activeTemplates]
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="quickcheck-institutional-report.csv"');
    res.send(rows.map((row) => row.map(csvEscape).join(',')).join('\n'));
    return;
  }

  res.json(report);
});

export const activityLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 30);

  if (isDemoMode()) {
    const items = await demoStore.listActivities({ limit, severity: req.query.severity, action: req.query.action });
    res.json({ items });
    return;
  }

  const query = {};
  if (req.query.severity) query.severity = req.query.severity;
  if (req.query.action) query.action = req.query.action;
  const items = await ActivityLog.find(query).populate('actor').sort({ createdAt: -1 }).limit(limit);
  res.json({ items });
});

export const notificationCenter = asyncHandler(async (_req, res) => {
  const certificates = await getAllCertificates();
  res.json({ items: buildNotifications(certificates) });
});
