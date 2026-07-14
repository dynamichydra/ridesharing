/**
 * Check if current time falls within a time window.
 * startTime / endTime: "HH:MM" strings (24h)
 * daysOfWeek: [0-6] (0=Sunday). null = every day.
 * timezone: IANA tz (e.g. "America/Toronto") — night/day rules must be evaluated in the
 * ride's country-local time, not server time, or "night surge" fires at the wrong hour
 * for every country except whichever one matches the server's own timezone.
 * Handles overnight ranges (e.g. 22:00–05:00).
 */
export function isTimeInRange(startTime, endTime, daysOfWeek = null, timezone = null) {
  const now = new Date();
  const { day, hour, minute } = timezone ? localParts(now, timezone) : {
    day: now.getDay(), hour: now.getHours(), minute: now.getMinutes(),
  };

  if (daysOfWeek && !daysOfWeek.includes(day)) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = hour * 60 + minute;
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) return nowMin >= startMin && nowMin < endMin;
  // Overnight: e.g. 22:00–05:00
  return nowMin >= startMin || nowMin < endMin;
}

function localParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const weekdayIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: weekdayIndex[get('weekday')],
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
