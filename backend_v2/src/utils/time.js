import moment from 'moment-timezone';

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
  const m = timezone ? moment.tz(timezone) : moment();

  if (daysOfWeek && !daysOfWeek.includes(m.day())) {
    return false;
  }

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const nowMin = m.hour() * 60 + m.minute();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (startMin <= endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  // Overnight: e.g. 22:00–05:00
  return nowMin >= startMin || nowMin < endMin;
}

/**
 * Add days to a date using moment.
 */
export function addDays(date, days) {
  return moment(date).add(days, 'days').toDate();
}

/**
 * Add minutes to a date using moment.
 */
export function addMinutes(date, minutes) {
  return moment(date).add(minutes, 'minutes').toDate();
}

/**
 * Add hours to a date using moment.
 */
export function addHours(date, hours) {
  return moment(date).add(hours, 'hours').toDate();
}

/**
 * Subtract days from a date using moment.
 */
export function subtractDays(date, days) {
  return moment(date).subtract(days, 'days').toDate();
}

/**
 * Subtract minutes from a date using moment.
 */
export function subtractMinutes(date, minutes) {
  return moment(date).subtract(minutes, 'minutes').toDate();
}

/**
 * Format a date as an ISO string.
 */
export function formatISO(date = new Date()) {
  return moment(date).toISOString();
}

/**
 * Format a date with custom pattern and optional timezone.
 */
export function formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss', timezone = null) {
  if (!date) return '';
  const m = timezone ? moment(date).tz(timezone) : moment(date);
  return m.format(format);
}

/**
 * Difference in minutes between two dates.
 */
export function diffMinutes(dateA, dateB) {
  return moment(dateA).diff(moment(dateB), 'minutes');
}

/**
 * Difference in seconds between two dates.
 */
export function diffSeconds(dateA, dateB) {
  return moment(dateA).diff(moment(dateB), 'seconds');
}

/**
 * Checks if dateA is before dateB.
 */
export function isBefore(dateA, dateB) {
  return moment(dateA).isBefore(moment(dateB));
}

/**
 * Checks if dateA is after dateB.
 */
export function isAfter(dateA, dateB) {
  return moment(dateA).isAfter(moment(dateB));
}

/**
 * Checks if date is between start and end.
 */
export function isBetween(date, start, end) {
  return moment(date).isBetween(moment(start), moment(end));
}

/**
 * Returns a Javascript Date for the current time (optionally in a timezone).
 */
export function now(timezone = null) {
  return timezone ? moment.tz(timezone).toDate() : moment().toDate();
}

export { moment };
export default moment;

