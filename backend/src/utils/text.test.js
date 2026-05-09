import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeText, textFingerprint, tokenSimilarity } from './text.js';

test('normalizeText removes punctuation and case noise', () => {
  assert.equal(normalizeText('Joseph Raju Janga!'), 'joseph raju janga');
});

test('textFingerprint sorts unique tokens for duplicate checks', () => {
  assert.equal(textFingerprint('MongoDB MongoDB Developer Joseph'), 'developer joseph mongodb');
});

test('tokenSimilarity handles reordered certificate names', () => {
  assert.equal(tokenSimilarity('Joseph Raju Janga MongoDB', 'Janga Joseph Raju MongoDB'), 100);
});

