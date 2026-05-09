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

const profileFor = (certificationId, organizationId, palette) => ({
  _id: id(),
  certification: certificationId,
  organization: organizationId,
  status: 'ACTIVE',
  version: 1,
  samples: [],
  thresholds: { nameSimilarity: 78, visualSimilarity: 70, fraudReview: 65, fraudReject: 92 },
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
    metadata: { trainedSamples: 8, trainingQuality: 'demo-reference' }
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
    analysis: {
      fraudProbability: 12,
      confidence: 88,
      nameSimilarity: 96,
      visualSimilarity: 91,
      suspiciousIndicators: [],
      anomalies: [],
      recommendation: 'LOW_RISK'
    },
    createdAt: new Date('2026-01-13'),
    updatedAt: new Date('2026-01-14')
  }
];
certificates[0].id = certificates[0]._id;

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
      thresholds: profile.thresholds || { nameSimilarity: 78, visualSimilarity: 70, fraudReview: 65, fraudReject: 92 },
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
    certificate.updatedAt = new Date();
    return this.decorateCertificate(certificate);
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
