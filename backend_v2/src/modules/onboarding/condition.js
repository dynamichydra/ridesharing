/** Shared conditional-question evaluator — used both when rendering config and re-validating submitted answers. */
export function evaluateCondition(operator, expected, actual) {
  if (actual === undefined || actual === null) return false;
  switch (operator) {
    case 'equals':     return JSON.stringify(actual) === JSON.stringify(expected);
    case 'not_equals': return JSON.stringify(actual) !== JSON.stringify(expected);
    case 'in':          return Array.isArray(expected) && expected.some((v) => JSON.stringify(v) === JSON.stringify(actual));
    case 'gt':          return Number(actual) > Number(expected);
    case 'lt':          return Number(actual) < Number(expected);
    default:            return false;
  }
}

/** Given all questions + an answer map (questionId -> value), returns the set of currently-visible question ids. */
export function resolveVisibleQuestionIds(questions, answersByQuestionId) {
  const visible = new Set();
  for (const q of questions) {
    if (!q.dependsOnQuestionId) { visible.add(q.id); continue; }
    const actual = answersByQuestionId[q.dependsOnQuestionId];
    if (evaluateCondition(q.dependsOnOperator, q.dependsOnValue, actual)) visible.add(q.id);
  }
  return visible;
}
