export const normalizeText = (value = '') =>
  value
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const textFingerprint = (value = '') => {
  const tokens = normalizeText(value).split(' ').filter(Boolean);
  return [...new Set(tokens)].sort().join(' ');
};

export const tokenSimilarity = (left = '', right = '') => {
  const a = new Set(textFingerprint(left).split(' ').filter(Boolean));
  const b = new Set(textFingerprint(right).split(' ').filter(Boolean));
  if (!a.size || !b.size) return 0;

  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((intersection / union) * 100);
};

