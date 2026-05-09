import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import slugify from 'slugify';

const now = new Date();
const id = () => crypto.randomBytes(12).toString('hex');

const orgMongo = { _id: id(), id: null, name: 'MongoDB', slug: 'mongodb', website: 'https://mongodb.com', riskWeight: 1.1, active: true };
const orgCisco = { _id: id(), id: null, name: 'Cisco', slug: 'cisco', website: 'https://cisco.com', riskWeight: 1.05, active: true };
const orgAws = { _id: id(), id: null, name: 'AWS', slug: 'aws', website: 'https://aws.amazon.com', riskWeight: 1.15, active: true };
const orgCoursera = { _id: id(), id: null, name: 'Coursera', slug: 'coursera', website: 'https://coursera.org', riskWeight: 1, active: true };
const orgGoogle = { _id: id(), id: null, name: 'Google', slug: 'google', website: 'https://google.com', riskWeight: 1.1, active: true };
const orgMicrosoft = { _id: id(), id: null, name: 'Microsoft', slug: 'microsoft', website: 'https://microsoft.com', riskWeight: 1.08, active: true };
const orgOracle = { _id: id(), id: null, name: 'Oracle', slug: 'oracle', website: 'https://oracle.com', riskWeight: 1.05, active: true };

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
    level: 'ASSOCIATE',
    skills: ['MongoDB', 'Aggregation', 'Schema Design'],
    active: true
  },
  {
    _id: id(),
    organization: orgCisco._id,
    name: 'Cisco CyberOps Associate',
    slug: 'cisco-cyberops-associate',
    level: 'ASSOCIATE',
    skills: ['SOC Monitoring', 'Networking', 'Threat Analysis'],
    active: true
  },
  {
    _id: id(),
    organization: orgAws._id,
    name: 'AWS Certified Cloud Practitioner',
    slug: 'aws-certified-cloud-practitioner',
    level: 'FOUNDATIONAL',
    skills: ['Cloud Foundations', 'IAM', 'Billing'],
    active: true
  },
  {
    _id: id(),
    organization: orgCoursera._id,
    name: 'Google Data Analytics Professional Certificate',
    slug: 'google-data-analytics-professional-certificate',
    level: 'PROFESSIONAL',
    skills: ['Data Analysis', 'SQL', 'Dashboards'],
    active: true
  },
  {
    _id: id(),
    organization: orgMicrosoft._id,
    name: 'Microsoft Azure Fundamentals',
    slug: 'microsoft-azure-fundamentals',
    level: 'FOUNDATIONAL',
    skills: ['Azure', 'Cloud Security', 'Governance'],
    active: true
  },
  {
    _id: id(),
    organization: orgOracle._id,
    name: 'Oracle Cloud Infrastructure Foundations',
    slug: 'oracle-cloud-infrastructure-foundations',
    level: 'FOUNDATIONAL',
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
  organization: expose(organizations.find((org) => org._id === certification.organization))
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
  listCatalog(search = '') {
    const q = search.toLowerCase();
    return certifications
      .filter((cert) => {
        const org = organizations.find((item) => item._id === cert.organization);
        return !q || cert.name.toLowerCase().includes(q) || org?.name.toLowerCase().includes(q);
      })
      .map(withOrganization);
  },
  listOrganizations() {
    return organizations.map(expose);
  },
  findCertification(idOrSlug) {
    const cert = certifications.find((item) => item._id === idOrSlug || item.slug === idOrSlug);
    return cert ? withOrganization(cert) : null;
  },
  findTemplateByCertification(certificationId) {
    return expose(templates.find((template) => template.certification === certificationId && template.status === 'ACTIVE'));
  },
  upsertTemplate(certificationId, profile, mentorId, samples = []) {
    const existing = templates.find((template) => template.certification === certificationId);
    const certification = certifications.find((cert) => cert._id === certificationId);
    if (!certification) return null;

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

