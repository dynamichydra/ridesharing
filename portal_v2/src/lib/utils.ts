import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import moment from "moment"

export { moment }

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const LocalStorage = {
  get: <T = any>(key: string): T | null => {
    try {
      const item = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: (key: string, value: any): void => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.error("LocalStorage set error:", e);
    }
  },
  remove: (key: string): void => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error("LocalStorage remove error:", e);
    }
  },
  clear: (): void => {
    try {
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
    } catch (e) {
      console.error("LocalStorage clear error:", e);
    }
  },
};

/**
 * Formats a timestamp/date to time string (e.g. "02:30 PM").
 */
export function formatTime(value?: string | number | Date | null, formatStr: string = "hh:mm A"): string {
  if (!value) return "—";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.format(formatStr);
}

/**
 * Formats a timestamp/date to date string (e.g. "Aug 30, 2026").
 */
export function formatDate(value?: string | number | Date | null, formatStr: string = "MMM D, YYYY"): string {
  if (!value) return "—";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.format(formatStr);
}

/**
 * Formats a timestamp/date to full datetime string (e.g. "Aug 30, 2026, 02:30 PM").
 */
export function formatDateTime(value?: string | number | Date | null, formatStr: string = "MMM D, YYYY, hh:mm A"): string {
  if (!value) return "—";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.format(formatStr);
}

/**
 * Formats a timestamp/date relative to now (e.g. "5 minutes ago", "in 2 days").
 */
export function formatRelative(value?: string | number | Date | null): string {
  if (!value) return "—";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.fromNow();
}

/**
 * Formats a timestamp/date using calendar relative dates (e.g. "Today at 2:30 PM", "Yesterday at 1:15 AM").
 */
export function formatCalendar(value?: string | number | Date | null): string {
  if (!value) return "—";
  const m = moment(value);
  if (!m.isValid()) return String(value);
  return m.calendar();
}


