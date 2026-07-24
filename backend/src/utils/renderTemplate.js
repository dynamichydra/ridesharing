// Simple {{variable}} interpolation for notification template bodies/subjects. A variable with
// no matching key renders as empty string rather than throwing — a template referencing a
// variable an event doesn't provide shouldn't take the whole send down.
export function renderTemplate(str, vars = {}) {
  if (!str) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (vars[key] ?? ''));
}
