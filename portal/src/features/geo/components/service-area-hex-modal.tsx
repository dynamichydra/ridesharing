import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { cellToBoundary, polygonToCells, cellToLatLng } from "h3-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Hexagon,
  MapPin,
  Maximize2,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Info,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import type { CityServiceArea } from "../types";

import { loadGoogleMapsScript } from "@/lib/google-maps";

interface ServiceAreaHexModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area: CityServiceArea | null;
}


const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#475569" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
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

function extractPolygonPoints(polygon: any): { lat: number; lng: number }[] {
  if (!polygon) return [];
  let parsed = polygon;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (parsed?.type === "Feature" && parsed.geometry) {
    return extractPolygonPoints(parsed.geometry);
  }
  if (parsed?.type === "FeatureCollection" && Array.isArray(parsed.features) && parsed.features[0]) {
    return extractPolygonPoints(parsed.features[0]);
  }

  let ring: any = null;
  if (parsed?.coordinates && Array.isArray(parsed.coordinates)) {
    if (
      Array.isArray(parsed.coordinates[0]) &&
      Array.isArray(parsed.coordinates[0][0]) &&
      Array.isArray(parsed.coordinates[0][0][0])
    ) {
      ring = parsed.coordinates[0][0];
    } else if (Array.isArray(parsed.coordinates[0]) && Array.isArray(parsed.coordinates[0][0])) {
      ring = parsed.coordinates[0];
    } else if (Array.isArray(parsed.coordinates[0]) && typeof parsed.coordinates[0][0] === "number") {
      ring = parsed.coordinates;
    }
  } else if (Array.isArray(parsed)) {
    if (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
      ring = parsed[0];
    } else if (Array.isArray(parsed[0])) {
      ring = parsed;
    }
  }

  if (!Array.isArray(ring) || ring.length < 3) return [];

  return ring
    .map((pt: any) => {
      if (Array.isArray(pt) && pt.length >= 2) {
        const v0 = Number(pt[0]);
        const v1 = Number(pt[1]);
        if (isNaN(v0) || isNaN(v1)) return null;

        if (v0 > 55 && v0 <= 180 && v1 >= -90 && v1 <= 90) {
          return { lat: v1, lng: v0 };
        }
        if (v1 > 55 && v1 <= 180 && v0 >= -90 && v0 <= 90) {
          return { lat: v0, lng: v1 };
        }
        return { lat: v1, lng: v0 };
      }
      if (pt && typeof pt === "object" && "lat" in pt && "lng" in pt) {
        const lat = Number(pt.lat);
        const lng = Number(pt.lng);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
      return null;
    })
    .filter((p): p is { lat: number; lng: number } => p !== null);
}

function getGeoJsonRingsForH3(points: { lat: number; lng: number }[]): number[][][] | null {
  if (points.length < 3) return null;
  const ring = points.map((p) => [p.lng, p.lat]);
  if (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1]) {
    ring.push([ring[0][0], ring[0][1]]);
  }
  return [ring];
}

export function ServiceAreaHexModal({
  open,
  onOpenChange,
  area,
}: ServiceAreaHexModalProps) {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const hexPolygonsRef = useRef<any[]>([]);
  const boundaryPolygonRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showHexCells, setShowHexCells] = useState(true);
  const [showBoundary, setShowBoundary] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    id: string;
    center: [number, number];
  } | null>(null);

  useEffect(() => {
    if (window.google?.maps?.Map) {
      setMapLoaded(true);
      return;
    }

    window.gm_authFailure = () => {
      setLoadError("Google Maps authentication warning: check API key restrictions or billing.");
    };

    loadGoogleMapsScript()
      .then(() => setMapLoaded(true))
      .catch((err) => {
        console.error("Google Maps load failure:", err);
        setLoadError("Failed to load Google Maps API script. Please check your internet connection.");
      });
  }, []);


  const { boundaryCoords, hexCells, resolution } = useMemo(() => {
    if (!area) return { boundaryCoords: [], hexCells: [], resolution: 9 };

    const res = area.resolution ?? 9;
    const parsedCoords = extractPolygonPoints(area.polygon);

    let cells: string[] = [];

    if (Array.isArray(area.hexCells) && area.hexCells.length > 0) {
      cells = area.hexCells;
    } else if (typeof area.hexCells === "string") {
      try {
        const parsed = JSON.parse(area.hexCells);
        if (Array.isArray(parsed)) cells = parsed;
      } catch {
        // ignore
      }
    }

    if (cells.length === 0 && parsedCoords.length >= 3) {
      const rings = getGeoJsonRingsForH3(parsedCoords);
      if (rings) {
        try {
          cells = polygonToCells(rings, res, true);
        } catch (err) {
          console.warn("h3-js polygonToCells generation error:", err);
        }
      }
    }

    return {
      boundaryCoords: parsedCoords,
      hexCells: cells,
      resolution: res,
    };
  }, [area]);

  const clearMapObjects = useCallback(() => {
    hexPolygonsRef.current.forEach((p) => {
      if (p) p.setMap(null);
    });
    hexPolygonsRef.current = [];
    if (boundaryPolygonRef.current) {
      boundaryPolygonRef.current.setMap(null);
      boundaryPolygonRef.current = null;
    }
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  }, []);

  const fitBoundsToArea = useCallback(
    (map: any) => {
      if (!map || !window.google?.maps) return;

      const bounds = new window.google.maps.LatLngBounds();
      let pointCount = 0;

      if (boundaryCoords.length >= 3) {
        boundaryCoords.forEach((pt) => {
          bounds.extend(new window.google.maps.LatLng(pt.lat, pt.lng));
          pointCount++;
        });
      }

      if (hexCells.length > 0) {
        const sampleLimit = Math.min(hexCells.length, 100);
        for (let i = 0; i < sampleLimit; i++) {
          try {
            const boundary = cellToBoundary(hexCells[i]);
            boundary.forEach(([lat, lng]) => {
              if (!isNaN(lat) && !isNaN(lng)) {
                bounds.extend(new window.google.maps.LatLng(lat, lng));
                pointCount++;
              }
            });
          } catch {
            // ignore
          }
        }
      }

      if (pointCount > 0) {
        const div = map.getDiv?.();
        const width = div?.clientWidth || 0;
        const height = div?.clientHeight || 0;
        const padding = width > 200 && height > 200 ? 50 : 10;
        try {
          map.fitBounds(bounds, padding);
        } catch {
          map.fitBounds(bounds);
        }
      }
    },
    [boundaryCoords, hexCells]
  );

  const renderOverlays = useCallback(
    (map: any, infoWindow: any) => {
      if (!map || !window.google?.maps) return;

      clearMapObjects();

      const isDarkMode = document.documentElement.classList.contains("dark");

      // 1. Boundary Polygon (Outer Outline)
      if (showBoundary && boundaryCoords.length >= 3) {
        const boundaryPoly = new window.google.maps.Polygon({
          paths: boundaryCoords,
          strokeColor: "#4f46e5",
          strokeOpacity: 1.0,
          strokeWeight: 3.5,
          fillColor: "#6366f1",
          fillOpacity: 0.06,
          map: map,
          zIndex: 5,
        });

        boundaryPolygonRef.current = boundaryPoly;
      }

      // 2. H3 Hexagons with prominent visual contrast
      if (showHexCells && hexCells.length > 0) {
        const hexStrokeColor = isDarkMode ? "#38bdf8" : "#0284c7";
        const hexFillColor = isDarkMode ? "#0284c7" : "#0ea5e9";
        const hexHoverColor = "#f59e0b";

        const polygons: any[] = [];

        hexCells.forEach((cellId) => {
          try {
            const boundary = cellToBoundary(cellId);
            if (!Array.isArray(boundary) || boundary.length < 3) return;

            const paths = boundary.map(([lat, lng]) => ({
              lat: Number(lat),
              lng: Number(lng),
            }));

            const hexPoly = new window.google.maps.Polygon({
              paths: paths,
              strokeColor: hexStrokeColor,
              strokeOpacity: 0.85,
              strokeWeight: 1.5,
              fillColor: hexFillColor,
              fillOpacity: 0.32,
              map: map,
              zIndex: 15,
              clickable: true,
            });

            hexPoly.addListener("mouseover", () => {
              hexPoly.setOptions({
                fillColor: hexHoverColor,
                strokeColor: hexHoverColor,
                fillOpacity: 0.65,
                strokeWeight: 2.5,
                zIndex: 30,
              });

              try {
                const center = cellToLatLng(cellId);
                setSelectedCell({ id: cellId, center });
              } catch {
                // ignore
              }
            });

            hexPoly.addListener("mouseout", () => {
              hexPoly.setOptions({
                fillColor: hexFillColor,
                strokeColor: hexStrokeColor,
                fillOpacity: 0.32,
                strokeWeight: 1.5,
                zIndex: 15,
              });
            });

            // Click triggers detailed info and React state
            hexPoly.addListener("click", (event: any) => {
              try {
                const center = cellToLatLng(cellId);
                setSelectedCell({ id: cellId, center });

                infoWindow.setContent(`
                  <div style="padding: 8px 12px; font-family: system-ui, sans-serif; font-size: 12px; color: #0f172a; min-width: 170px;">
                    <div style="font-weight: 700; color: #0284c7; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                      ⬡ H3 Hex Cell
                    </div>
                    <div style="margin-bottom: 3px;"><strong>Index:</strong> <code style="background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 11px;">${cellId}</code></div>
                    <div style="margin-bottom: 3px;"><strong>Resolution:</strong> Res ${resolution}</div>
                    <div><strong>Center:</strong> ${center[0].toFixed(5)}, ${center[1].toFixed(5)}</div>
                  </div>
                `);
                infoWindow.setPosition(event.latLng);
                infoWindow.open(map);
              } catch {
                // ignore
              }
            });

            polygons.push(hexPoly);
          } catch (err) {
            console.warn("Failed rendering hex cell:", cellId, err);
          }
        });

        hexPolygonsRef.current = polygons;
      }
    },
    [clearMapObjects, showBoundary, boundaryCoords, showHexCells, hexCells, resolution]
  );

  // Clean up map objects when modal closes
  useEffect(() => {
    if (!open) {
      clearMapObjects();
      mapInstanceRef.current = null;
      infoWindowRef.current = null;
    }
  }, [open, clearMapObjects]);

  // Initialize or re-fit Map when container element is ready and has non-zero size
  useEffect(() => {
    if (!open || !mapLoaded || !containerEl || !window.google?.maps?.Map) {
      return;
    }

    let isDestroyed = false;

    const setupOrResizeMap = (width: number, height: number) => {
      if (isDestroyed || width <= 0 || height <= 0) return;

      const isDarkMode = document.documentElement.classList.contains("dark");

      if (!mapInstanceRef.current) {
        const initialCenter = boundaryCoords[0] || { lat: 22.5726, lng: 88.3639 };
        const map = new window.google.maps.Map(containerEl, {
          center: initialCenter,
          zoom: 13,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            position: window.google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          styles: isDarkMode ? darkMapStyles : lightMapStyles,
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new window.google.maps.InfoWindow();

        renderOverlays(map, infoWindowRef.current);
        fitBoundsToArea(map);
      } else {
        window.google.maps.event.trigger(mapInstanceRef.current, "resize");
        fitBoundsToArea(mapInstanceRef.current);
      }
    };

    // Immediate check if element already has non-zero size
    const rect = containerEl.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setupOrResizeMap(rect.width, rect.height);
    }

    // ResizeObserver watches for modal animation completion and layout changes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setupOrResizeMap(width, height);
        }
      }
    });

    resizeObserver.observe(containerEl);

    // Fallback animation frame & timeouts during Radix Dialog entrance transition
    const raf = requestAnimationFrame(() => {
      const r = containerEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setupOrResizeMap(r.width, r.height);
      }
    });

    const t1 = setTimeout(() => {
      const r = containerEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setupOrResizeMap(r.width, r.height);
      }
    }, 150);

    const t2 = setTimeout(() => {
      const r = containerEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        setupOrResizeMap(r.width, r.height);
      }
    }, 350);

    return () => {
      isDestroyed = true;
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, mapLoaded, containerEl, area?.id, boundaryCoords, fitBoundsToArea, renderOverlays]);

  // Re-render overlays when visibility toggles change
  useEffect(() => {
    if (open && mapInstanceRef.current && infoWindowRef.current) {
      renderOverlays(mapInstanceRef.current, infoWindowRef.current);
    }
  }, [open, showHexCells, showBoundary, renderOverlays]);

  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    INACTIVE: "bg-muted text-muted-foreground border-border",
    RESTRICTED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  };

  const hasValidBoundary = boundaryCoords.length >= 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[950px] w-[95vw] h-[88vh] max-h-[850px] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-3.5 border-b border-border bg-card/90 backdrop-blur-xs shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                <Hexagon className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                {area?.name || "Service Area"}
                {area?.status && (
                  <Badge
                    variant="outline"
                    className={`font-mono text-[11px] font-medium ${
                      statusColors[area.status] || ""
                    }`}
                  >
                    {area.status}
                  </Badge>
                )}
              </DialogTitle>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground pl-8">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                {area?.city?.name || "City Region"}
              </span>
              <span>•</span>
              <span className="font-mono">Resolution: {resolution}</span>
              <span>•</span>
              <span className="font-semibold text-sky-600 dark:text-sky-400 font-mono">
                {hexCells.length} Hex Cells
              </span>
              <span>•</span>
              <span className="text-muted-foreground">
                {boundaryCoords.length} boundary vertices
              </span>
            </div>
          </div>

          {/* Quick Map Controls Toolbar */}
          <div className="flex items-center gap-2 pr-6">
            <Button
              variant={showHexCells ? "default" : "outline"}
              size="sm"
              onClick={() => setShowHexCells(!showHexCells)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
              title="Toggle H3 Hexagons Grid"
            >
              {showHexCells ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              Hexagons ({hexCells.length})
            </Button>
            <Button
              variant={showBoundary ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowBoundary(!showBoundary)}
              className="h-8 text-xs gap-1.5 cursor-pointer"
              title="Toggle Outer Boundary Polygon"
            >
              <Layers className="h-3.5 w-3.5" />
              Boundary ({boundaryCoords.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (mapInstanceRef.current) {
                  window.google.maps.event.trigger(mapInstanceRef.current, "resize");
                  fitBoundsToArea(mapInstanceRef.current);
                }
              }}
              className="h-8 text-xs gap-1.5 cursor-pointer"
              title="Recenter and Fit View"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Recenter
            </Button>
          </div>
        </DialogHeader>

        {/* Map Container Area */}
        <div className="relative flex-1 min-h-[420px] w-full bg-muted/30 overflow-hidden">
          {!mapLoaded && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs z-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Loading Google Maps & Service Area Boundary...
              </p>
            </div>
          )}

          {loadError && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-xs flex items-center justify-between gap-3 shadow-md backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{loadError}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setLoadError(null);
                  loadGoogleMapsScript().then(() => setMapLoaded(true));
                }}
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </Button>
            </div>
          )}

          {!hasValidBoundary && mapLoaded && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-md px-3 py-1.5 text-xs flex items-center gap-2 shadow-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>No valid polygon boundary coordinates found for this service area.</span>
            </div>
          )}

          {/* Absolute Positioned Google Maps DOM Container */}
          <div
            ref={setContainerEl}
            className="absolute inset-0 w-full h-full"
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }}
          />

          {/* Floating Info Overlay (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 max-w-xs pointer-events-none">
            {selectedCell ? (
              <div className="bg-card/95 backdrop-blur-md border border-border rounded-lg p-3 shadow-lg text-xs space-y-1.5 pointer-events-auto">
                <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-1">
                  <span className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Hexagon className="h-3.5 w-3.5" /> Selected Cell
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono py-0">
                    Res {resolution}
                  </Badge>
                </div>
                <div className="font-mono text-[11px] text-foreground select-all break-all">
                  {selectedCell.id}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Center: {selectedCell.center[0].toFixed(5)}, {selectedCell.center[1].toFixed(5)}
                </div>
              </div>
            ) : (
              <div className="bg-card/90 backdrop-blur-md border border-border/60 rounded-md px-2.5 py-1.5 shadow-md text-[11px] text-muted-foreground flex items-center gap-1.5 pointer-events-auto">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                Hover or click any hexagon to inspect its H3 index
              </div>
            )}
          </div>

          {/* Floating Stats Summary (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-10 bg-card/95 backdrop-blur-md border border-border rounded-lg px-3 py-2 shadow-lg text-xs flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 inline-block"></span>
              {hexCells.length} Hexagons
            </div>
            <div className="h-3 w-[1px] bg-border" />
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
              Boundary ({boundaryCoords.length} pts)
            </div>
            <div className="h-3 w-[1px] bg-border" />
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5" /> Google Maps
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
