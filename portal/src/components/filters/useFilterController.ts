import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { buildQueryString } from "./buildQueryString";

function parseQuery(search: string) {
  const params = new URLSearchParams(search);
  const obj: Record<string, any> = {};
  params.forEach((v, k) => {
    obj[k] = v;
  });
  return obj;
}

export function useFilterController(defaults: Record<string, any> = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  // Stabilize defaults using a ref so it doesn't trigger effect/memo loops
  const defaultsRef = useRef(defaults);

  // URL State
  const urlParams = useMemo(() => parseQuery(location.search), [location.search]);
  
  // Applied (Actual state used for API calls)
  const applied = useMemo(() => {
    const merged = { ...defaultsRef.current, ...urlParams };
    const normalized: Record<string, string> = {};
    Object.entries(merged).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "none") {
        normalized[k] = String(v);
      }
    });
    return normalized;
  }, [urlParams]);

  // Draft (Working state for input fields)
  const [draft, setDraft] = useState<Record<string, any>>(applied);

  // Sync draft when URL changes (e.g., on reset or back navigation)
  useEffect(() => {
    setDraft(applied);
  }, [applied]);

  // Enforce defaults in URL on mount if missing
  useEffect(() => {
    const currentParams = parseQuery(location.search);
    const missingDefaults = Object.keys(defaultsRef.current).some(key => !(key in currentParams));
    
    if (missingDefaults) {
      const nextParams = { ...defaultsRef.current, ...currentParams };
      const qs = buildQueryString(nextParams);
      if (qs) {
        navigate(`${location.pathname}?${qs}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  const setDraftValue = (key: string, value: any) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * Apply filters.
   * @param overrides Optional overrides to apply immediately (e.g., for pagination)
   */
  const apply = (overrides?: Record<string, any>) => {
    // If overrides is an event object (e.g. from onClick), ignore it
    const validOverrides = overrides && !(overrides instanceof Object && 'nativeEvent' in overrides) 
      ? overrides 
      : {};
      
    const nextParams = { ...draft, page: 1, ...validOverrides };
    const qs = buildQueryString(nextParams);
    navigate(`${location.pathname}?${qs}`);
  };

  const reset = () => {
    const qs = buildQueryString(defaultsRef.current);
    navigate(qs ? `${location.pathname}?${qs}` : location.pathname);
  };

  return {
    draft,
    applied,
    setDraftValue,
    apply,
    reset,
  };
}
