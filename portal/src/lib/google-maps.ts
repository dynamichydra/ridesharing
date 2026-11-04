declare global {
  interface Window {
    google?: any;
    __googleMapsCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

// Set VITE_GOOGLE_MAPS_KEY per environment (see .env.example) and restrict the key to the
// portal's domain in Google Cloud — never hard-code a fallback key in source.
export const GOOGLE_MAPS_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let googleMapsPromise: Promise<void> | null = null;

/**
 * Loads the Google Maps JavaScript API with the modern & recommended
 * `loading=async` and callback pattern (prevents console warnings and improves performance).
 */
export function loadGoogleMapsScript(apiKey: string = GOOGLE_MAPS_KEY): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  // Already loaded and ready
  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps is not configured (VITE_GOOGLE_MAPS_KEY is missing)"));
  }

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__googleMapsCallback";
    const scriptId = "google-maps-js-sdk";

    // Set global callback
    window[callbackName] = () => {
      resolve();
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.google?.maps?.Map) {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      googleMapsPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
