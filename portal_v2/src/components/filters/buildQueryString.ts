export function buildQueryString(params: Record<string, any>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "none") return;
    query.set(key, String(value));
  });

  return query.toString();
}
