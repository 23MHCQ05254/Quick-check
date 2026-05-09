import { BadgeCheck, BrainCircuit, Cloud, Code2, Database, Network, ShieldCheck, Sparkles, TableProperties } from 'lucide-react';

export const CATEGORY_LABELS = {
  DATABASE: 'Database',
  CLOUD: 'Cloud',
  NETWORKING: 'Networking',
  DATA: 'Data',
  SECURITY: 'Security',
  DEVELOPER_TOOLS: 'Developer Tools',
  BUSINESS: 'Business',
  OTHER: 'Other'
};

export const DIFFICULTY_LABELS = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
  EXPERT: 'Expert'
};

export const VERIFICATION_LABELS = {
  OCR_QR: 'OCR + QR',
  TEMPLATE_MATCH: 'Template Match',
  HYBRID_AI: 'Hybrid AI',
  MANUAL_REVIEW: 'Manual Review'
};

export const CATEGORY_ICONS = {
  DATABASE: Database,
  CLOUD: Cloud,
  NETWORKING: Network,
  DATA: TableProperties,
  SECURITY: ShieldCheck,
  DEVELOPER_TOOLS: Code2,
  BUSINESS: BadgeCheck,
  OTHER: Sparkles
};

export const verificationIcon = (type) => (type === 'HYBRID_AI' ? BrainCircuit : ShieldCheck);

export const pretty = (value, map = {}) => map[value] || value?.replaceAll('_', ' ') || 'Not set';

