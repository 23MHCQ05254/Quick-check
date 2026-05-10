import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import slugify from 'slugify';
import { normalizeSkills, parsePagination } from '../utils/catalog.js';

const now = new Date();
const id = () => crypto.randomBytes(12).toString('hex');

const orgMongo = {
  _id: id(),
  id: null,
  name: 'MongoDB',
  slug: 'mongodb',
  description: 'Developer data platform certifications focused on document databases, aggregation, and application data modeling.',
  category: 'DATABASE',
  website: 'https://mongodb.com',
  logoUrl: '',
  brandColor: '#37E6A0',
  riskWeight: 1.1,
  active: true
};
const orgCisco = {
  _id: id(),
  id: null,
  name: 'Cisco',
  slug: 'cisco',
  description: 'Networking, cybersecurity, and SOC operations credentials used by enterprise infrastructure teams.',
  category: 'NETWORKING',
  website: 'https://cisco.com',
  logoUrl: '',
  brandColor: '#38D5FF',
  riskWeight: 1.05,
  active: true
};
const orgAws = {
  _id: id(),
  id: null,
  name: 'AWS',
  slug: 'aws',
  description: 'Cloud computing certifications covering architecture, operations, identity, security, and cloud foundations.',
  category: 'CLOUD',
  website: 'https://aws.amazon.com',
  logoUrl: '',
  brandColor: '#F6C667',
  riskWeight: 1.15,
  active: true
};
const orgCoursera = {
  _id: id(),
  id: null,
  name: 'Coursera',
  slug: 'coursera',
  description: 'Professional certificate programs from global universities and technology partners.',
  category: 'DATA',
  website: 'https://coursera.org',
  logoUrl: '',
  brandColor: '#38D5FF',
  riskWeight: 1,
  active: true
};
const orgGoogle = {
  _id: id(),
  id: null,
  name: 'Google',
  slug: 'google',
  description: 'Google Cloud, data, cybersecurity, and career certificate programs for industry-aligned skills.',
  category: 'CLOUD',
  website: 'https://google.com',
  logoUrl: '',
  brandColor: '#4285F4',
  riskWeight: 1.1,
  active: true
};
const orgMicrosoft = {
  _id: id(),
  id: null,
  name: 'Microsoft',
  slug: 'microsoft',
  description: 'Azure, security, data, and productivity certifications used by enterprise technology teams.',
  category: 'CLOUD',
  website: 'https://microsoft.com',
  logoUrl: '',
  brandColor: '#7FBA00',
  riskWeight: 1.08,
  active: true
};
const orgOracle = {
  _id: id(),
  id: null,
  name: 'Oracle',
  slug: 'oracle',
  description: 'Database, Java, and Oracle Cloud Infrastructure credentials for enterprise systems.',
  category: 'CLOUD',
  website: 'https://oracle.com',
  logoUrl: '',
  brandColor: '#FF6B8A',
  riskWeight: 1.05,
  active: true
};

const organizations = [orgMongo, orgCisco, orgAws, orgCoursera, orgGoogle, orgMicrosoft, orgOracle].map((org) => ({
  ...org,
  id: org._id
}));

const certifications = [
  {
    _id: id(),
    organization: orgMongo._id,
    name: 'MongoDB Associate Developer',
    slug: 'mongodb-associate-developer',
    description: 'Validates practical MongoDB development skills including CRUD operations, indexes, aggregation pipelines, and schema design.',
    level: 'ASSOCIATE',
    difficultyLevel: 'INTERMEDIATE',
    category: 'DATABASE',
    verificationType: 'HYBRID_AI',
    templateStatus: 'ACTIVE',
    skills: ['MongoDB', 'Aggregation', 'Schema Design'],
    active: true
  },
  {
    _id: id(),
    organization: orgCisco._id,
    name: 'Cisco CyberOps Associate',
    slug: 'cisco-cyberops-associate',
    description: 'Covers security monitoring, incident response, network intrusion analysis, and SOC workflows.',
    level: 'ASSOCIATE',
    difficultyLevel: 'INTERMEDIATE',
    category: 'SECURITY',
    verificationType: 'OCR_QR',
    templateStatus: 'ACTIVE',
    skills: ['SOC Monitoring', 'Networking', 'Threat Analysis'],
    active: true
  },
  {
    _id: id(),
    organization: orgAws._id,
    name: 'AWS Certified Cloud Practitioner',
    slug: 'aws-certified-cloud-practitioner',
    description: 'Foundational cloud certification covering AWS services, billing, support, security, and shared responsibility.',
    level: 'FOUNDATIONAL',
    difficultyLevel: 'BEGINNER',
    category: 'CLOUD',
    verificationType: 'HYBRID_AI',
    templateStatus: 'ACTIVE',
    skills: ['Cloud Foundations', 'IAM', 'Billing'],
    active: true
  },
  {
    _id: id(),
    organization: orgCoursera._id,
    name: 'Google Data Analytics Professional Certificate',
    slug: 'google-data-analytics-professional-certificate',
    description: 'Professional certificate covering data cleaning, analysis, SQL, visualization, and stakeholder reporting.',
    level: 'PROFESSIONAL',
    difficultyLevel: 'INTERMEDIATE',
    category: 'DATA',
    verificationType: 'TEMPLATE_MATCH',
    templateStatus: 'ACTIVE',
    skills: ['Data Analysis', 'SQL', 'Dashboards'],
    active: true
  },
  {
    _id: id(),
    organization: orgMicrosoft._id,
    name: 'Microsoft Azure Fundamentals',
    slug: 'microsoft-azure-fundamentals',
    description: 'Introductory Azure certification for cloud concepts, governance, identity, pricing, and platform services.',
    level: 'FOUNDATIONAL',
    difficultyLevel: 'BEGINNER',
    category: 'CLOUD',
    verificationType: 'HYBRID_AI',
    templateStatus: 'ACTIVE',
    skills: ['Azure', 'Cloud Security', 'Governance'],
    active: true
  },
  {
    _id: id(),
    organization: orgOracle._id,
    name: 'Oracle Cloud Infrastructure Foundations',
    slug: 'oracle-cloud-infrastructure-foundations',
    description: 'Foundational OCI credential for compute, storage, identity, networking, database, and cloud economics.',
    level: 'FOUNDATIONAL',
    difficultyLevel: 'BEGINNER',
    category: 'CLOUD',
    verificationType: 'OCR_QR',
    templateStatus: 'ACTIVE',
    skills: ['Oracle Cloud', 'Networking', 'Compute'],
    active: true
  }
].map((cert) => ({ ...cert, id: cert._id }));

const computeThresholds = (trainedSamples = 0) => {
  // Derive thresholds from available trained sample count.
  // More samples => stricter thresholds and narrower review window.
  const baseName = 60;
  const baseVisual = 55;
  const nameSimilarity = Math.min(98, baseName + Math.round(Math.min(trainedSamples, 10) * 3.5));
  const visualSimilarity = Math.min(96, baseVisual + Math.round(Math.min(trainedSamples, 10) * 3));
  const fraudReview = Math.max(50, 80 - Math.round(Math.min(trainedSamples, 10) * 1.5));
  const fraudReject = Math.min(98, fraudReview + 30);
  return { nameSimilarity, visualSimilarity, fraudReview, fraudReject };
};

const profileFor = (certificationId, organizationId, palette, trainedSamples = 8) => ({
  _id: id(),
  certification: certificationId,
  organization: organizationId,
  status: 'ACTIVE',
  version: 1,
  samples: [],
  thresholds: computeThresholds(trainedSamples),
  extractedProfile: {
    resolution: { width: 1600, height: 1130, aspectRatio: 1.416 },
    dominantColors: palette,
    brightness: 222,
    edgeDensity: 0.18,
    textDensity: 0.32,
    qrRegions: [{ x: 1280, y: 860, width: 160, height: 160 }],
    logoRegions: [{ x: 120, y: 90, width: 220, height: 90 }],
    textBlocks: [
      { label: 'student_name', x: 420, y: 470, width: 760, height: 80 },
      { label: 'certificate_id', x: 1040, y: 965, width: 280, height: 42 }
    ],
    metadata: { trainedSamples, trainingQuality: 'demo-reference' }
  }
});

const templates = certifications.map((cert, index) =>
  profileFor(cert._id, cert.organization, [
    ['#0EA5E9', '#111827', '#F8FAFC'],
    ['#22C55E', '#0F172A', '#F8FAFC'],
    ['#F59E0B', '#111827', '#FFFFFF'],
    ['#14B8A6', '#1F2937', '#F8FAFC'],
    ['#3B82F6', '#111827', '#F8FAFC'],
    ['#EF4444', '#111827', '#FFF7ED']
  ][index]
  )
);

const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));

const computeAnalysis = ({ certificateId = '', studentName = '', certificationId = '' } = {}) => {
  const template = templates.find((t) => t.certification === certificationId) || null;
  const thresholds = template?.thresholds || computeThresholds(0);
  const seedHex = crypto.createHash('sha256').update(`${certificateId}:${studentName}`).digest('hex').slice(0, 8);
  const seed = parseInt(seedHex, 16) || 0;

  const jitter = (seed % 21) - 10; // -10..10
  const nameSimilarity = clamp((thresholds.nameSimilarity || 70) + jitter, 40, 100);
  const visualSimilarity = clamp((thresholds.visualSimilarity || 65) + Math.round(jitter * 0.8), 30, 100);
  const avg = (nameSimilarity + visualSimilarity) / 2;
  const fraudProbability = clamp(Math.round(100 - avg + (seed % 7) - 3), 0, 99);
  const confidence = clamp(50 + Math.round(avg / 2), 40, 99);

  const suspiciousIndicators = [];
  const anomalies = [];
  if (nameSimilarity < thresholds.nameSimilarity) suspiciousIndicators.push('Student name similarity is below threshold');
  if (visualSimilarity < thresholds.visualSimilarity) suspiciousIndicators.push('Visual profile differs from template reference');
  if ((template?.extractedProfile?.qrRegions || []).length === 0) suspiciousIndicators.push('QR region not present in template');
  if (suspiciousIndicators.length > 0) anomalies.push({ code: 'DEMO_ANALYSIS_FLAGS', severity: suspiciousIndicators.includes('Student name similarity is below threshold') ? 'HIGH' : 'MEDIUM' });

  const recommendation = fraudProbability >= thresholds.fraudReject ? 'REJECT' : fraudProbability >= thresholds.fraudReview ? 'MENTOR_REVIEW' : 'LOW_RISK';

  return {
    fraudProbability,
    confidence,
    nameSimilarity,
    visualSimilarity,
    suspiciousIndicators,
    anomalies,
    recommendation
  };
};

const users = [
  {
    _id: id(),
    name: 'Joseph Raju Janga',
    email: 'student@quickcheck.edu',
    password: bcrypt.hashSync('password123', 8),
    role: 'STUDENT',
    department: 'Computer Science',
    rollNumber: 'QC23CS042',
    graduationYear: 2027,
    publicSlug: 'joseph-raju-janga',
    skills: ['MongoDB', 'Cloud Foundations', 'Threat Analysis'],
    skillScore: 74,
    placementReadiness: 68,
    notifications: [
      {
        title: 'MongoDB template active',
        body: 'Your selected certificate type has a mentor-trained reference profile.',
        read: false,
        createdAt: now
      }
    ]
  },
  {
    _id: id(),
    name: 'Dr. Ananya Rao',
    email: 'mentor@quickcheck.edu',
    password: bcrypt.hashSync('mentor123', 8),
    role: 'MENTOR',
    department: 'Placement Cell',
    publicSlug: 'dr-ananya-rao',
    skills: ['Verification', 'Placement Analytics'],
    skillScore: 91,
    placementReadiness: 0,
    notifications: []
  },
  {
    _id: id(),
    name: 'Meera Nanduri',
    email: 'meera@quickcheck.edu',
    password: bcrypt.hashSync('password123', 8),
    role: 'STUDENT',
    department: 'Information Technology',
    rollNumber: 'QC23IT018',
    graduationYear: 2027,
    publicSlug: 'meera-nanduri',
    skills: ['Cloud Foundations', 'Azure', 'Governance'],
    skillScore: 68,
    placementReadiness: 72,
    notifications: []
  },
  {
    _id: id(),
    name: 'Arjun Varma',
    email: 'arjun@quickcheck.edu',
    password: bcrypt.hashSync('password123', 8),
    role: 'STUDENT',
    department: 'Electronics and Communication',
    rollNumber: 'QC23EC031',
    graduationYear: 2026,
    publicSlug: 'arjun-varma',
    skills: ['SOC Monitoring', 'Networking', 'Threat Analysis'],
    skillScore: 59,
    placementReadiness: 54,
    notifications: []
  },
  {
    _id: id(),
    name: 'Nisha Iyer',
    email: 'nisha@quickcheck.edu',
    password: bcrypt.hashSync('password123', 8),
    role: 'STUDENT',
    department: 'Computer Science',
    rollNumber: 'QC23CS077',
    graduationYear: 2028,
    publicSlug: 'nisha-iyer',
    skills: ['Data Analysis', 'SQL', 'Dashboards'],
    skillScore: 82,
    placementReadiness: 79,
    notifications: []
  }
].map((user) => ({ ...user, id: user._id }));

const certificates = [
  {
    _id: id(),
    id: null,
    student: users[0]._id,
    certification: certifications[0]._id,
    organization: organizations[0]._id,
    title: certifications[0].name,
    certificateId: 'MDB-DEV-2026-1042',
    issueDate: new Date('2026-01-12'),
    fileUrl: '',
    filePath: '',
    originalName: 'mongodb-associate-demo.png',
    qrData: 'https://verify.quickcheck.demo/MDB-DEV-2026-1042',
    ocrText: 'MongoDB Associate Developer Joseph Raju Janga Certificate ID MDB-DEV-2026-1042',
    textFingerprint: 'associate certificate developer id janga joseph mongodb raju',
    imageHash: 'demo-hash-mongodb-1042',
    status: 'VERIFIED',
    analysis: computeAnalysis({ certificateId: 'MDB-DEV-2026-1042', studentName: 'Joseph Raju Janga', certificationId: certifications[0]._id }),
    createdAt: new Date('2026-01-13'),
    updatedAt: new Date('2026-01-14')
  },
  {
    _id: id(),
    id: null,
    student: users[2]._id,
    certification: certifications[2]._id,
    organization: organizations[2]._id,
    title: certifications[2].name,
    certificateId: 'AWS-CCP-2026-2210',
    issueDate: new Date('2026-02-18'),
    fileUrl: '',
    filePath: '',
    originalName: 'aws-cloud-practitioner.png',
    qrData: 'https://aws.amazon.com/verification/AWS-CCP-2026-2210',
    ocrText: 'AWS Certified Cloud Practitioner Meera Nanduri AWS-CCP-2026-2210',
    textFingerprint: 'aws certified cloud meera nanduri practitioner',
    imageHash: 'demo-hash-aws-2210',
    status: 'PENDING',
    locked: false,
    analysis: computeAnalysis({ certificateId: 'AWS-CCP-2026-2210', studentName: 'Meera Nanduri', certificationId: certifications[2]._id }),
    createdAt: new Date('2026-02-19'),
    updatedAt: new Date('2026-02-19')
  },
  {
    _id: id(),
    id: null,
    student: users[3]._id,
    certification: certifications[1]._id,
    organization: organizations[1]._id,
    title: certifications[1].name,
    certificateId: 'CYB-OPS-2026-8891',
    issueDate: new Date('2026-03-08'),
    fileUrl: '',
    filePath: '',
    originalName: 'cisco-cyberops-review.png',
    qrData: '',
    ocrText: 'Cisco CyberOps Associate Arjun V. Certificate CYB-OPS-2026-8891',
    textFingerprint: 'associate certificate cisco cyberops arjun',
    imageHash: 'demo-hash-cisco-8891',
    status: 'REVIEW_REQUIRED',
    locked: false,
    analysis: computeAnalysis({ certificateId: 'CYB-OPS-2026-8891', studentName: 'Arjun Varma', certificationId: certifications[1]._id }),
    createdAt: new Date('2026-03-09'),
    updatedAt: new Date('2026-03-09')
  },
  {
    _id: id(),
    id: null,
    student: users[4]._id,
    certification: certifications[3]._id,
    organization: organizations[3]._id,
    title: certifications[3].name,
    certificateId: 'GDA-2026-4117',
    issueDate: new Date('2026-04-22'),
    fileUrl: '',
    filePath: '',
    originalName: 'google-data-analytics.png',
    qrData: 'https://coursera.org/verify/GDA-2026-4117',
    ocrText: 'Google Data Analytics Professional Certificate Nisha Iyer GDA-2026-4117',
    textFingerprint: 'analytics certificate data google iyer nisha',
    imageHash: 'demo-hash-gda-4117',
    status: 'VERIFIED',
    locked: false,
    analysis: computeAnalysis({ certificateId: 'GDA-2026-4117', studentName: 'Nisha Iyer', certificationId: certifications[3]._id }),
    createdAt: new Date('2026-04-23'),
    updatedAt: new Date('2026-04-24')
  }
];
certificates.forEach((certificate) => {
  certificate.id = certificate._id;
});

const activityLogs = [
  {
    _id: id(),
    actor: users[1]._id,
    actorRole: 'MENTOR',
    action: 'TEMPLATE_PROFILE_ACTIVATED',
    entityType: 'TemplateProfile',
    entityId: templates[0]._id,
    severity: 'INFO',
    message: 'MongoDB Associate Developer template profile activated',
    metadata: { certification: 'MongoDB Associate Developer' },
    createdAt: new Date('2026-01-12T10:30:00.000Z')
  },
  {
    _id: id(),
    actor: users[0]._id,
    actorRole: 'STUDENT',
    action: 'CERTIFICATE_UPLOADED',
    entityType: 'Certificate',
    entityId: certificates[0]._id,
    severity: 'LOW',
    message: 'Joseph Raju Janga uploaded MongoDB Associate Developer',
    metadata: { fraudProbability: certificates[0].analysis?.fraudProbability ?? null },
    createdAt: new Date('2026-01-13T09:15:00.000Z')
  },
  {
    _id: id(),
    actor: users[1]._id,
    actorRole: 'MENTOR',
    action: 'CERTIFICATE_VERIFIED',
    entityType: 'Certificate',
    entityId: certificates[0]._id,
    severity: 'INFO',
    message: 'Mentor verified MongoDB Associate Developer certificate',
    metadata: { status: 'VERIFIED' },
    createdAt: new Date('2026-01-14T12:20:00.000Z')
  }
].map((log) => ({ ...log, id: log._id }));

const expose = (record) => (record ? { ...record, id: record._id } : null);
const withOrganization = (certification) => ({
  ...expose(certification),
  organization: expose(organizations.find((org) => org._id === certification.organization)),
  organizationName: organizations.find((org) => org._id === certification.organization)?.name || '',
  certificateName: certification.name,
  logo: certification.logoUrl || organizations.find((org) => org._id === certification.organization)?.logoUrl || '',
  uploadCount: certificates.filter((cert) => cert.certification === certification._id).length,
  templateReady: certification.templateStatus === 'ACTIVE' || Boolean(templates.find((template) => template.certification === certification._id && template.status === 'ACTIVE'))
});

export const demoStore = {
  users,
  organizations,
  certifications,
  templates,
  certificates,
  activityLogs,
  findUserById(userId) {
    return expose(users.find((user) => user._id === userId || user.id === userId));
  },
  findUserByEmail(email) {
    return expose(users.find((user) => user.email === email.toLowerCase()));
  },
  async createStudent(payload) {
    const user = {
      _id: id(),
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: await bcrypt.hash(payload.password, 8),
      role: 'STUDENT',
      department: payload.department || '',
      rollNumber: payload.rollNumber || '',
      graduationYear: payload.graduationYear || null,
      publicSlug: `${slugify(payload.name, { lower: true, strict: true })}-${Math.random().toString(36).slice(2, 6)}`,
      skills: [],
      skillScore: 30,
      placementReadiness: 25,
      notifications: []
    };
    user.id = user._id;
    users.push(user);
    return expose(user);
  },
  listCatalog(input = '') {
    const params = typeof input === 'string' ? { search: input } : input;
    const q = (params.search || '').toLowerCase();
    const organization = params.organization || '';
    const category = params.category || '';
    const difficultyLevel = params.difficultyLevel || '';
    const verificationType = params.verificationType || '';
    const templateStatus = params.templateStatus || '';
    const { page, limit, skip } = parsePagination(params);

    const filtered = certifications
      .filter((cert) => {
        const org = organizations.find((item) => item._id === cert.organization);
        const haystack = `${cert.name} ${cert.description || ''} ${(cert.skills || []).join(' ')} ${org?.name || ''}`.toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (organization && cert.organization !== organization && org?.slug !== organization) return false;
        if (category && cert.category !== category) return false;
        if (difficultyLevel && cert.difficultyLevel !== difficultyLevel) return false;
        if (verificationType && cert.verificationType !== verificationType) return false;
        if (templateStatus && cert.templateStatus !== templateStatus) return false;
        return cert.active !== false;
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    const items = filtered.slice(skip, skip + limit).map(withOrganization);
    return {
      items,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / limit))
      }
    };
  },
  listOrganizations(includeStats = false) {
    return organizations
      .filter((org) => org.active !== false)
      .map((org) => ({
        ...expose(org),
        certificationCount: includeStats ? certifications.filter((cert) => cert.organization === org._id && cert.active !== false).length : undefined,
        uploadCount: includeStats ? certificates.filter((cert) => cert.organization === org._id).length : undefined,
        trainedTemplates: includeStats ? templates.filter((template) => template.organization === org._id && template.status === 'ACTIVE').length : undefined
      }));
  },
  findCertification(idOrSlug) {
    const cert = certifications.find((item) => item._id === idOrSlug || item.slug === idOrSlug);
    return cert ? withOrganization(cert) : null;
  },
  facets() {
    const categories = [...new Set(certifications.map((cert) => cert.category).filter(Boolean))];
    const difficultyLevels = [...new Set(certifications.map((cert) => cert.difficultyLevel).filter(Boolean))];
    const verificationTypes = [...new Set(certifications.map((cert) => cert.verificationType).filter(Boolean))];
    const templateStatuses = [...new Set(certifications.map((cert) => cert.templateStatus).filter(Boolean))];
    const skills = [...new Set(certifications.flatMap((cert) => cert.skills || []))].sort();
    return {
      organizations: this.listOrganizations(true),
      categories,
      difficultyLevels,
      verificationTypes,
      templateStatuses,
      skills
    };
  },
  createOrganization(payload) {
    const slug = slugify(payload.name, { lower: true, strict: true });
    if (organizations.some((org) => org.slug === slug)) return null;
    const organization = {
      _id: id(),
      id: null,
      name: payload.name,
      slug,
      description: payload.description || '',
      category: payload.category || 'OTHER',
      website: payload.website || '',
      logoUrl: payload.logoUrl || '',
      brandColor: payload.brandColor || '#38D5FF',
      riskWeight: Number(payload.riskWeight) || 1,
      active: payload.active !== false
    };
    organization.id = organization._id;
    organizations.push(organization);
    return expose(organization);
  },
  updateOrganization(organizationId, payload) {
    const organization = organizations.find((org) => org._id === organizationId || org.id === organizationId);
    if (!organization) return null;
    const nextName = payload.name || organization.name;
    Object.assign(organization, {
      ...payload,
      name: nextName,
      slug: payload.name ? slugify(nextName, { lower: true, strict: true }) : organization.slug,
      riskWeight: payload.riskWeight !== undefined ? Number(payload.riskWeight) : organization.riskWeight
    });
    return expose(organization);
  },
  deleteOrganization(organizationId) {
    const organization = organizations.find((org) => org._id === organizationId || org.id === organizationId);
    if (!organization) return null;
    organization.active = false;
    certifications.forEach((cert) => {
      if (cert.organization === organization._id) cert.active = false;
    });
    return expose(organization);
  },
  createCertification(payload) {
    const organization = organizations.find((org) => org._id === payload.organizationId || org.id === payload.organizationId || org.slug === payload.organizationSlug);
    if (!organization) return null;
    const name = payload.certificateName || payload.name;
    const cert = {
      _id: id(),
      id: null,
      organization: organization._id,
      name,
      slug: slugify(name, { lower: true, strict: true }),
      description: payload.description || '',
      level: payload.level || 'ASSOCIATE',
      difficultyLevel: payload.difficultyLevel || 'INTERMEDIATE',
      category: payload.category || organization.category || 'OTHER',
      verificationType: payload.verificationType || 'HYBRID_AI',
      logoUrl: payload.logoUrl || '',
      skills: normalizeSkills(payload.skills),
      active: payload.active !== false,
      templateStatus: payload.templateStatus || 'NOT_TRAINED',
      metadata: payload.metadata || {}
    };
    cert.id = cert._id;
    certifications.push(cert);
    return withOrganization(cert);
  },
  updateCertification(certificationId, payload) {
    const cert = certifications.find((item) => item._id === certificationId || item.id === certificationId);
    if (!cert) return null;
    const organization = payload.organizationId
      ? organizations.find((org) => org._id === payload.organizationId || org.id === payload.organizationId)
      : null;
    const nextName = payload.certificateName || payload.name || cert.name;
    Object.assign(cert, {
      ...payload,
      organization: organization?._id || cert.organization,
      name: nextName,
      slug: nextName !== cert.name ? slugify(nextName, { lower: true, strict: true }) : cert.slug,
      skills: payload.skills !== undefined ? normalizeSkills(payload.skills) : cert.skills
    });
    return withOrganization(cert);
  },
  deleteCertification(certificationId) {
    const cert = certifications.find((item) => item._id === certificationId || item.id === certificationId);
    if (!cert) return null;
    cert.active = false;
    cert.templateStatus = 'RETIRED';
    return withOrganization(cert);
  },
  findTemplateByCertification(certificationId) {
    return expose(templates.find((template) => template.certification === certificationId && template.status === 'ACTIVE'));
  },
  upsertTemplate(certificationId, profile, mentorId, samples = []) {
    const existing = templates.find((template) => template.certification === certificationId);
    const certification = certifications.find((cert) => cert._id === certificationId);
    if (!certification) return null;
    certification.templateStatus = 'ACTIVE';

    const next = {
      ...(existing || { _id: id(), certification: certificationId, organization: certification.organization, version: 0 }),
      status: 'ACTIVE',
      version: (existing?.version || 0) + 1,
      createdBy: mentorId,
      samples,
      thresholds: profile.thresholds || computeThresholds(profile?.extractedProfile?.metadata?.trainedSamples || samples.length || 0),
      extractedProfile: profile.extractedProfile || profile
    };

    if (existing) {
      Object.assign(existing, next);
      return expose(existing);
    }

    next.id = next._id;
    templates.push(next);
    return expose(next);
  },
  listTemplates() {
    return templates.map((template) => ({
      ...expose(template),
      certification: withOrganization(certifications.find((cert) => cert._id === template.certification)),
      organization: expose(organizations.find((org) => org._id === template.organization))
    }));
  },
  addCertificate(payload) {
    const record = {
      _id: id(),
      id: null,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    record.id = record._id;
    certificates.unshift(record);
    this.addActivity({
      actor: payload.student,
      actorRole: 'STUDENT',
      action: 'CERTIFICATE_UPLOADED',
      entityType: 'Certificate',
      entityId: record._id,
      severity: payload.status === 'REVIEW_REQUIRED' ? 'HIGH' : 'LOW',
      message: `${payload.title} uploaded for AI-assisted verification`,
      metadata: { status: payload.status, fraudProbability: payload.analysis?.fraudProbability || 0 }
    });
    return expose(record);
  },
  listCertificatesForStudent(studentId) {
    return certificates
      .filter((cert) => cert.student === studentId)
      .map((cert) => this.decorateCertificate(cert));
  },
  listAllCertificates() {
    return certificates.map((cert) => this.decorateCertificate(cert));
  },
  decorateCertificate(certificate) {
    const student = users.find((user) => user._id === certificate.student);
    const certification = certifications.find((cert) => cert._id === certificate.certification);
    const organization = organizations.find((org) => org._id === certificate.organization);
    return {
      ...expose(certificate),
      student: student ? expose(student) : certificate.student,
      certification: certification ? expose(certification) : certificate.certification,
      organization: organization ? expose(organization) : certificate.organization
    };
  },
  findDuplicate({ certificateId, qrData, imageHash, organization, issueDate, textSimilarity }) {
    return certificates.find((cert) => {
      if (certificateId && cert.certificateId && cert.certificateId.toLowerCase() === certificateId.toLowerCase()) return true;
      if (qrData && cert.qrData && cert.qrData === qrData) return true;
      if (imageHash && cert.imageHash && cert.imageHash === imageHash) return true;
      const sameOrgDate =
        organization &&
        issueDate &&
        cert.organization === organization &&
        cert.issueDate &&
        new Date(cert.issueDate).toISOString().slice(0, 10) === new Date(issueDate).toISOString().slice(0, 10);
      return sameOrgDate && textSimilarity >= 90;
    });
  },
  reviewCertificate(certificateId, payload) {
    const certificate = certificates.find((cert) => cert._id === certificateId || cert.id === certificateId);
    if (!certificate) return null;
    certificate.status = payload.status;
    certificate.reviewNotes = payload.reviewNotes || '';
    certificate.reviewedBy = payload.reviewedBy;
    certificate.reviewedAt = new Date();
    certificate.moderation = {
      ...(certificate.moderation || {}),
      overrideReason: payload.overrideReason || payload.reviewNotes || '',
      manualReviewRequested: payload.status === 'REVIEW_REQUIRED'
    };
    certificate.updatedAt = new Date();
    this.addActivity({
      actor: payload.reviewedBy,
      actorRole: 'MENTOR',
      action: `CERTIFICATE_${payload.status}`,
      entityType: 'Certificate',
      entityId: certificate._id,
      severity: payload.status === 'REJECTED' ? 'HIGH' : payload.status === 'REVIEW_REQUIRED' ? 'MEDIUM' : 'INFO',
      message: `${certificate.title} moved to ${payload.status.replaceAll('_', ' ')}`,
      metadata: { reviewNotes: payload.reviewNotes }
    });
    return this.decorateCertificate(certificate);
  },
  moderateCertificate(certificateId, payload) {
    const certificate = certificates.find((cert) => cert._id === certificateId || cert.id === certificateId);
    if (!certificate) return null;
    if (payload.status) certificate.status = payload.status;
    if (payload.locked !== undefined) certificate.locked = payload.locked;
    certificate.reviewNotes = payload.reviewNotes || certificate.reviewNotes || '';
    certificate.moderation = {
      ...(certificate.moderation || {}),
      overrideReason: payload.overrideReason || certificate.moderation?.overrideReason || '',
      manualReviewRequested: payload.manualReviewRequested ?? certificate.moderation?.manualReviewRequested ?? false
    };
    certificate.updatedAt = new Date();
    this.addActivity({
      actor: payload.actor,
      actorRole: 'MENTOR',
      action: 'CERTIFICATE_MODERATED',
      entityType: 'Certificate',
      entityId: certificate._id,
      severity: certificate.status === 'REJECTED' ? 'HIGH' : 'INFO',
      message: `${certificate.title} moderation state updated`,
      metadata: { status: certificate.status, locked: certificate.locked }
    });
    return this.decorateCertificate(certificate);
  },
  rerunCertificate(certificateId, actor) {
    const certificate = certificates.find((cert) => cert._id === certificateId || cert.id === certificateId);
    if (!certificate) return null;
    const currentRisk = certificate.analysis?.fraudProbability || 0;
    certificate.analysis = {
      ...(certificate.analysis || {}),
      fraudProbability: Math.max(3, Math.min(96, currentRisk + (currentRisk > 60 ? -4 : 2))),
      confidence: Math.min(96, (certificate.analysis?.confidence || 70) + 3),
      recommendation: currentRisk > 60 ? 'MENTOR_REVIEW' : 'LOW_RISK'
    };
    certificate.moderation = {
      ...(certificate.moderation || {}),
      rerunCount: (certificate.moderation?.rerunCount || 0) + 1,
      lastRerunAt: new Date()
    };
    certificate.updatedAt = new Date();
    this.addActivity({
      actor,
      actorRole: 'MENTOR',
      action: 'AI_ANALYSIS_RERUN',
      entityType: 'Certificate',
      entityId: certificate._id,
      severity: 'MEDIUM',
      message: `AI analysis rerun for ${certificate.title}`,
      metadata: { fraudProbability: certificate.analysis.fraudProbability }
    });
    return this.decorateCertificate(certificate);
  },
  deleteCertificate(certificateId, actor) {
    const certificate = certificates.find((cert) => cert._id === certificateId || cert.id === certificateId);
    if (!certificate) return null;
    certificate.status = 'REJECTED';
    certificate.moderation = {
      ...(certificate.moderation || {}),
      deletedAt: new Date(),
      deletedBy: actor
    };
    this.addActivity({
      actor,
      actorRole: 'MENTOR',
      action: 'CERTIFICATE_ARCHIVED',
      entityType: 'Certificate',
      entityId: certificate._id,
      severity: 'HIGH',
      message: `${certificate.title} upload archived by mentor`,
      metadata: { certificateId: certificate.certificateId }
    });
    return this.decorateCertificate(certificate);
  },
  addActivity(payload) {
    const record = {
      _id: id(),
      id: null,
      ...payload,
      createdAt: payload.createdAt || new Date()
    };
    record.id = record._id;
    activityLogs.unshift(record);
    return expose(record);
  },
  listActivities({ limit = 30, severity = '', action = '' } = {}) {
    return activityLogs
      .filter((log) => (!severity || log.severity === severity) && (!action || log.action === action))
      .slice(0, Number(limit))
      .map((log) => ({
        ...expose(log),
        actor: expose(users.find((user) => user._id === log.actor)) || log.actor
      }));
  },
  findPortfolio(slug) {
    const user = users.find((item) => item.publicSlug === slug);
    if (!user || user.role !== 'STUDENT') return null;
    return {
      student: expose(user),
      certificates: certificates
        .filter((cert) => cert.student === user._id && cert.status === 'VERIFIED')
        .map((cert) => this.decorateCertificate(cert))
    };
  }
};
