import { useEffect, useRef, useState, useCallback } from "react";
import { loadGoogleMapsScript } from "@/lib/google-maps";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, Trash2, MapPin, PencilLine } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContextOverlay {
  polygon: any;
  label: string;
  color?: string;
}

export interface ServiceAreaMapDrawerProps {
  polygonJson: string;
  onPolygonChange: (json: string) => void;
  contextOverlays?: ContextOverlay[];
  hint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate helpers — all conversions are [lng, lat] (GeoJSON convention)
// ─────────────────────────────────────────────────────────────────────────────

function buildGeoJSONString(path: { lat: number; lng: number }[]): string {
  const coords: number[][] = path.map((pt) => [pt.lng, pt.lat]);
  if (
    coords.length > 0 &&
    (coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1])
  ) {
    coords.push([coords[0][0], coords[0][1]]);
  }
  return JSON.stringify({ type: "Polygon", coordinates: [coords] }, null, 2);
}

function parseJsonToLatLng(json: string): { lat: number; lng: number }[] | null {
  if (!json || !json.trim()) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(json.trim());
  } catch {
    return null;
  }
  if (parsed?.type === "Feature" && parsed.geometry) parsed = parsed.geometry;
  if (
    parsed?.type === "FeatureCollection" &&
    Array.isArray(parsed.features) &&
    parsed.features[0]?.geometry
  ) {
    parsed = parsed.features[0].geometry;
  }

  let ring: any[] | null = null;
  if (parsed?.type === "Polygon" && Array.isArray(parsed.coordinates) && parsed.coordinates[0]) {
    ring = parsed.coordinates[0];
  } else if (
    parsed?.type === "MultiPolygon" &&
    Array.isArray(parsed.coordinates) &&
    parsed.coordinates[0]?.[0]
  ) {
    ring = parsed.coordinates[0][0];
  }

  if (!ring || ring.length < 3) return null;

  return ring
    .map((pt: any): { lat: number; lng: number } | null => {
      if (!Array.isArray(pt) || pt.length < 2) return null;
      const lng = Number(pt[0]);
      const lat = Number(pt[1]);
      if (isNaN(lng) || isNaN(lat)) return null;
      return { lat, lng };
    })
    .filter((p): p is { lat: number; lng: number } => p !== null);
}

function parseOverlayPolygon(polygon: any): { lat: number; lng: number }[] | null {
  if (!polygon) return null;
  const json = typeof polygon === "string" ? polygon : JSON.stringify(polygon);
  return parseJsonToLatLng(json);
}

// ─────────────────────────────────────────────────────────────────────────────
// Map styles
// ─────────────────────────────────────────────────────────────────────────────

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#475569" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
];

const lightMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#334155" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#bae6fd" }] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ServiceAreaMapDrawer({
  polygonJson,
  onPolygonChange,
  contextOverlays = [],
  hint,
}: ServiceAreaMapDrawerProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const mapRef = useRef<any>(null);
  const drawnPolygonRef = useRef<any>(null);
  const contextPolyRefs = useRef<any[]>([]);
  const autocompleteRef = useRef<any>(null);
  const polyListenersRef = useRef<any[]>([]);

  const lastSyncedJsonRef = useRef<string>("");

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasPolygon, setHasPolygon] = useState(false);

  // ── 1. Load Google Maps script ────────────────────────────────────────────
  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapLoaded(true);
      return;
    }
    window.gm_authFailure = () =>
      setLoadError("Google Maps authentication failed. Check API key restrictions or billing.");

    loadGoogleMapsScript()
      .then(() => setMapLoaded(true))
      .catch(() =>
        setLoadError(
          "Failed to load Google Maps. Check internet connection and API key configuration."
        )
      );
  }, []);

  // ── 2. Serialize polygon path → notify parent ─────────────────────────────
  const syncPolygonToJson = useCallback(() => {
    if (!drawnPolygonRef.current || !window.google?.maps) return;
    const pathArr: any[] = drawnPolygonRef.current.getPath().getArray();
    if (pathArr.length < 3) return;
    const pts = pathArr.map((p: any) => ({ lat: p.lat(), lng: p.lng() }));
    const json = buildGeoJSONString(pts);
    lastSyncedJsonRef.current = json;
    onPolygonChange(json);
  }, [onPolygonChange]);

  // ── 3. Attach/replace path listeners ─────────────────────────────────────
  const attachListeners = useCallback(
    (poly: any) => {
      polyListenersRef.current.forEach((l) => {
        try { window.google?.maps?.event?.removeListener(l); } catch { /* ignore */ }
      });
      polyListenersRef.current = [];
      if (!poly || !window.google?.maps) return;
      const path = poly.getPath();
      polyListenersRef.current = [
        path.addListener("set_at", syncPolygonToJson),
        path.addListener("insert_at", syncPolygonToJson),
        path.addListener("remove_at", syncPolygonToJson),
      ];
      // Right-click vertex to delete
      polyListenersRef.current.push(
        window.google.maps.event.addListener(poly, "rightclick", (e: any) => {
          if (e.vertex != null) {
            poly.getPath().removeAt(e.vertex);
          }
        })
      );
    },
    [syncPolygonToJson]
  );

  // ── 4. Clear the drawn polygon ────────────────────────────────────────────
  const clearDrawnPolygon = useCallback(() => {
    polyListenersRef.current.forEach((l) => {
      try { window.google?.maps?.event?.removeListener(l); } catch { /* ignore */ }
    });
    polyListenersRef.current = [];
    if (drawnPolygonRef.current) {
      drawnPolygonRef.current.setMap(null);
      drawnPolygonRef.current = null;
    }
    setHasPolygon(false);
    lastSyncedJsonRef.current = "";
    onPolygonChange("");
  }, [onPolygonChange]);

  // ── 5. Place/replace the editable polygon on the map ─────────────────────
  const placePolygon = useCallback(
    (pts: { lat: number; lng: number }[], shouldFitBounds = true) => {
      if (!mapRef.current || !window.google?.maps) return;

      polyListenersRef.current.forEach((l) => {
        try { window.google?.maps?.event?.removeListener(l); } catch { /* ignore */ }
      });
      polyListenersRef.current = [];
      if (drawnPolygonRef.current) {
        drawnPolygonRef.current.setMap(null);
        drawnPolygonRef.current = null;
      }

      const poly = new window.google.maps.Polygon({
        paths: pts,
        strokeColor: "#4f46e5",
        strokeOpacity: 1,
        strokeWeight: 2.5,
        fillColor: "#6366f1",
        fillOpacity: 0.18,
        editable: true,
        draggable: true,
        map: mapRef.current,
        zIndex: 10,
      });

      drawnPolygonRef.current = poly;
      setHasPolygon(true);
      attachListeners(poly);

      if (shouldFitBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        pts.forEach((p) => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
        if (!bounds.isEmpty()) mapRef.current.fitBounds(bounds, 60);
      }
    },
    [attachListeners]
  );

  // ── Starter Polygon (Simple alternative to DrawingManager) ───────────────
  const insertStarterPolygon = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    const center = mapRef.current.getCenter();
    const lat = center.lat();
    const lng = center.lng();
    
    // Create a square roughly scaled to the current zoom level
    const zoom = mapRef.current.getZoom() || 11;
    const offset = 0.05 * Math.pow(2, 11 - zoom); 
    
    const starterPts = [
      { lat: lat + offset, lng: lng - offset },
      { lat: lat + offset, lng: lng + offset },
      { lat: lat - offset, lng: lng + offset },
      { lat: lat - offset, lng: lng - offset },
    ];
    
    placePolygon(starterPts, false);
    
    const json = buildGeoJSONString(starterPts);
    lastSyncedJsonRef.current = json;
    onPolygonChange(json);
  }, [placePolygon, onPolygonChange]);

  // ── 6. Render read-only context overlays ─────────────────────────────────
  const renderContextOverlays = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;
    contextPolyRefs.current.forEach((p) => { try { p?.setMap(null); } catch { /* ignore */ } });
    contextPolyRefs.current = [];

    contextOverlays.forEach((overlay) => {
      const pts = parseOverlayPolygon(overlay.polygon);
      if (!pts || pts.length < 3) return;
      const color = overlay.color || "#818cf8";
      const poly = new window.google.maps.Polygon({
        paths: pts,
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.08,
        editable: false,
        draggable: false,
        clickable: false,
        map: mapRef.current,
        zIndex: 4,
      });
      contextPolyRefs.current.push(poly);
    });
  }, [contextOverlays]);

  // ── 7. Initialize map ───────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !containerEl || !window.google?.maps?.Map) return;

    let destroyed = false;

    const setup = (w: number, h: number) => {
      if (destroyed || w <= 0 || h <= 0) return;
      if (mapRef.current) {
        window.google.maps.event.trigger(mapRef.current, "resize");
        return;
      }

      const isDark = document.documentElement.classList.contains("dark");
      const map = new window.google.maps.Map(containerEl, {
        center: { lat: 22.5726, lng: 88.3639 },
        zoom: 11,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: true,
        mapTypeControlOptions: {
          style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
          position: window.google.maps.ControlPosition.TOP_RIGHT,
        },
        streetViewControl: false,
        fullscreenControl: false,
        styles: isDark ? darkMapStyles : lightMapStyles,
      });
      mapRef.current = map;

      // Places Autocomplete
      if (searchInputRef.current && window.google.maps.places?.Autocomplete) {
        const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
          types: ["(cities)"],
        });
        ac.bindTo("bounds", map);
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place?.geometry?.location) return;
          if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
          } else {
            map.setCenter(place.geometry.location);
            map.setZoom(12);
          }
        });
        autocompleteRef.current = ac;
      }

      renderContextOverlays();

      if (polygonJson && polygonJson.trim()) {
        const pts = parseJsonToLatLng(polygonJson);
        if (pts && pts.length >= 3) {
          lastSyncedJsonRef.current = polygonJson;
          placePolygon(pts);
        }
      }
    };

    const rect = containerEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setup(rect.width, rect.height);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setup(width, height);
      }
    });
    ro.observe(containerEl);
    const raf = requestAnimationFrame(() => {
      const r = containerEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setup(r.width, r.height);
    });
    const t = setTimeout(() => {
      const r = containerEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setup(r.width, r.height);
    }, 300);

    return () => {
      destroyed = true;
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [mapLoaded, containerEl, polygonJson, placePolygon, renderContextOverlays]);

  // ── 8. Re-render context overlays when they change ───────────────────────
  useEffect(() => {
    if (mapRef.current) renderContextOverlays();
  }, [renderContextOverlays]);

  // ── 9. JSON → Map sync (external JSON edits reflected on the map) ─────────
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    if (polygonJson === lastSyncedJsonRef.current) return;

    if (!polygonJson || !polygonJson.trim()) {
      if (drawnPolygonRef.current) {
        polyListenersRef.current.forEach((l) => {
          try { window.google?.maps?.event?.removeListener(l); } catch { /* ignore */ }
        });
        polyListenersRef.current = [];
        drawnPolygonRef.current.setMap(null);
        drawnPolygonRef.current = null;
        setHasPolygon(false);
      }
      lastSyncedJsonRef.current = "";
      return;
    }

    const pts = parseJsonToLatLng(polygonJson);
    if (pts && pts.length >= 3) {
      lastSyncedJsonRef.current = polygonJson;
      placePolygon(pts);
    }
  }, [polygonJson, mapLoaded, placePolygon]);

  // ── 10. Full cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      polyListenersRef.current.forEach((l) => {
        try { window.google?.maps?.event?.removeListener(l); } catch { /* ignore */ }
      });
      try { drawnPolygonRef.current?.setMap(null); } catch { /* ignore */ }
      contextPolyRefs.current.forEach((p) => { try { p?.setMap(null); } catch { /* ignore */ } });
      mapRef.current = null;
      drawnPolygonRef.current = null;
      autocompleteRef.current = null;
    };
  }, []);

  const handleRetry = () => {
    setLoadError(null);
    loadGoogleMapsScript()
      .then(() => setMapLoaded(true))
      .catch(() => setLoadError("Still unable to load Google Maps. Check network and API key."));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for a city or location…"
            className="w-full h-9 rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={!mapLoaded || !!loadError}
          />
        </div>
        {!hasPolygon && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={insertStarterPolygon}
            className="h-9 gap-1.5 cursor-pointer shrink-0"
            disabled={!mapLoaded || !!loadError}
          >
            <PencilLine className="h-3.5 w-3.5" />
            Draw Boundary
          </Button>
        )}
        {hasPolygon && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearDrawnPolygon}
            className="h-9 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer shrink-0"
            title="Clear drawn polygon and start over"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {contextOverlays.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">Legend:</span>
          {contextOverlays.map((o, i) => (
            <span key={i} className="flex items-center gap-1">
              <span
                className="inline-block w-3 h-3 rounded-sm border"
                style={{
                  backgroundColor: `${o.color || "#818cf8"}22`,
                  borderColor: o.color || "#818cf8",
                }}
              />
              {o.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-sm border border-indigo-500 bg-indigo-500/15" />
            Your boundary
          </span>
        </div>
      )}

      <div
        className="relative w-full rounded-lg border border-border overflow-hidden bg-muted/30"
        style={{ height: 380 }}
      >
        {!mapLoaded && !loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading Google Maps…</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4 p-6 bg-muted/60">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium text-center">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="gap-1.5 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Google Maps is optional — you can still define the boundary by pasting GeoJSON
              coordinates in the JSON editor below.
            </p>
          </div>
        )}

        {!mapLoaded || loadError || hasPolygon ? null : (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur-sm border border-border text-xs px-3 py-1.5 rounded-full shadow text-muted-foreground whitespace-nowrap pointer-events-none">
            {hint || "Search for a city, then click 'Draw Boundary'"}
          </div>
        )}

        <div
          ref={setContainerEl}
          className="absolute inset-0 w-full h-full"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </div>

      {mapLoaded && !loadError && hasPolygon && (
        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex flex-wrap items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          Polygon inserted. Drag the centre to move it, or drag the white handles to shape it. Right-click a vertex to delete it.
        </p>
      )}
    </div>
  );
}
