/**
 * Check if current time falls within a time window.
 * startTime / endTime: "HH:MM" strings (24h)
 * daysOfWeek: [0-6] (0=Sunday). null = every day.
 * Handles overnight ranges (e.g. 22:00–05:00).
 */
export function isTimeInRange(startTime, endTime, daysOfWeek = null) {
  const now = new Date();
  const day = now.getDay();

  if (daysOfWeek && !daysOfWeek.includes(day)) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) return nowMin >= startMin && nowMin < endMin;
  // Overnight: e.g. 22:00–05:00
  return nowMin >= startMin || nowMin < endMin;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
