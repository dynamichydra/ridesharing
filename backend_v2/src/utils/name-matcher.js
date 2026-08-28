/**
 * Fuzzy Name Matching Utility for Bank & KYC verification
 * Computes similarity percentage between driver profile name and name returned by bank / NPCI.
 */

const HONORIFICS = new Set([
  'mr', 'mrs', 'ms', 'miss', 'dr', 'shri', 'smt', 'shree', 'kumar', 'kumari', 'md', 'mohd', 'mohammed',
]);

/**
 * Clean and normalize names:
 * - Convert to lowercase
 * - Strip punctuation & special characters
 * - Remove common honorifics/prefixes
 * - Sort tokens if needed for word-order variations
 */
export function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !HONORIFICS.has(token))
    .join(' ')
    .trim();
}

/**
 * Standard Levenshtein Distance
 */
export function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Token-based similarity score (handles flipped names e.g. "Subrata Pramanik" vs "Pramanik Subrata")
 */
export function tokenSimilarity(name1, name2) {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 100;

  const words1 = norm1.split(' ').filter(Boolean);
  const words2 = norm2.split(' ').filter(Boolean);

  let totalWordScore = 0;
  for (const w1 of words1) {
    let bestMatch = 0;
    for (const w2 of words2) {
      if (w1 === w2) {
        bestMatch = 1;
        break;
      }
      const maxL = Math.max(w1.length, w2.length);
      const dist = levenshteinDistance(w1, w2);
      const wordScore = (maxL - dist) / maxL;
      if (wordScore > bestMatch) bestMatch = wordScore;
    }
    totalWordScore += bestMatch;
  }

  const tokenScore = (totalWordScore / Math.max(words1.length, words2.length)) * 100;

  // Global string distance on sorted tokens
  const sorted1 = [...words1].sort().join(' ');
  const sorted2 = [...words2].sort().join(' ');
  const maxLen = Math.max(sorted1.length, sorted2.length);
  const levDist = levenshteinDistance(sorted1, sorted2);
  const globalScore = maxLen > 0 ? ((maxLen - levDist) / maxLen) * 100 : 0;

  return Math.round((tokenScore * 0.7) + (globalScore * 0.3));
}

/**
 * Check if match score meets threshold (default 80%)
 */
export function isNameMatch(driverName, bankRegisteredName, threshold = 80) {
  const score = tokenSimilarity(driverName, bankRegisteredName);
  return {
    isMatch: score >= threshold,
    score,
    normalizedDriverName: normalizeName(driverName),
    normalizedBankName: normalizeName(bankRegisteredName),
  };
}
