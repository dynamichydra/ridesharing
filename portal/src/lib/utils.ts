import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check if the code is running in a browser environment
export const isBrowser = typeof window !== "undefined";

export class LocalStorage {
  // Get a value from local storage by key
  static get(key: string) {
    if (!isBrowser) return;
    const value = localStorage.getItem(key);
    if (value) {
      try {
        return JSON.parse(atob(value));
      } catch (err) {
        return null;
      }
    }
    return null;
  }

  // Set a value in local storage by key
  static set(key: string, value: any) {
    
    if (!isBrowser) return;
    localStorage.setItem(key, btoa(JSON.stringify(value)));
  }

  // Remove a value from local storage by key
  static remove(key: string) {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  }

  // Clear all items from local storage
  static clear() {
    if (!isBrowser) return;
    localStorage.clear();
  }
}
export async function hashStringSHA256(str: string) {
  if (str == "") {
    return "";
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

type ProductCode = {
  matCode: string;
  supplyCode: number;
};
export const PRODUCT_TYPE_CODE:Record<string, ProductCode> = {
  "1.00 MM": {
    matCode: "LCSP-AL-0710",
    supplyCode: 2105,
  },
  "0.80 MM": {
    matCode: "LCSP-AL-0710",
    supplyCode: 2105,
  },
  RECON: {
    matCode: "DCVSENPOPMISSAT11",
    supplyCode: 2103,
  },
};

export const getProductCodesByName = (name: string) => {
  return PRODUCT_TYPE_CODE[name] || {
    matCode: "",
    supplyCode: "",
  };
};
