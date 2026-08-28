import { isNameMatch, normalizeName, tokenSimilarity } from '../src/utils/name-matcher.js';

const testCases = [
  { name1: 'Subrata Pramanik', name2: 'SUBRATA PRAMANIK', threshold: 80, expectedMatch: true },
  { name1: 'Subrata Pramanik', name2: 'PRAMANIK SUBRATA', threshold: 80, expectedMatch: true },
  { name1: 'Mr. Subrata Pramanik', name2: 'SUBRATA PRAMANIK', threshold: 80, expectedMatch: true },
  { name1: 'Mohammed Ali Khan', name2: 'MD ALI KHAN', threshold: 80, expectedMatch: true },
  { name1: 'Rahul Sharma', name2: 'Amit Kumar Singh', threshold: 80, expectedMatch: false },
  { name1: 'Subrata K. Pramanik', name2: 'SUBRATA PRAMANIK', threshold: 80, expectedMatch: true },
  { name1: 'Johnathan Doe', name2: 'John Doe', threshold: 80, expectedMatch: false }, // requires admin review due to length difference
];

console.log('--- Testing Name Matcher ---');
let passed = 0;
for (const tc of testCases) {
  const result = isNameMatch(tc.name1, tc.name2, tc.threshold);
  const ok = result.isMatch === tc.expectedMatch;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${tc.name1}" vs "${tc.name2}" => Score: ${result.score}% (Match: ${result.isMatch})`);
  if (ok) passed++;
}

console.log(`Summary: Passed ${passed}/${testCases.length} tests`);
if (passed !== testCases.length) process.exit(1);
