import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

