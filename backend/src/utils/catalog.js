export const CATEGORIES = ['DATABASE', 'CLOUD', 'NETWORKING', 'DATA', 'SECURITY', 'DEVELOPER_TOOLS', 'BUSINESS', 'OTHER'];
export const DIFFICULTY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
export const VERIFICATION_TYPES = ['OCR_QR', 'TEMPLATE_MATCH', 'HYBRID_AI', 'MANUAL_REVIEW'];
export const TEMPLATE_STATUSES = ['NOT_TRAINED', 'TRAINING', 'ACTIVE', 'RETIRED'];

export const parseCsv = (value = '') =>
  value
    .toString()
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, Number.parseInt(query.limit, 10) || 12));
  return { page, limit, skip: (page - 1) * limit };
};

export const regexSearch = (value) => new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

export const normalizeSkills = (skills = []) => {
  if (typeof skills === 'string') return parseCsv(skills);
  return Array.isArray(skills) ? skills.map((skill) => skill.toString().trim()).filter(Boolean) : [];
};

