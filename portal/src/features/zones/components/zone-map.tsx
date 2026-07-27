import { useCallback, useEffect, useRef, useState } from "react";
import type L from "leaflet";
import * as Leaflet from "leaflet";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Polygon,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
// leaflet-draw is a plain global-attaching plugin (no real ESM/CJS exports) — imported here
// purely for its side effect of registering L.Control.Draw / L.Draw on the Leaflet namespace.
// The react-leaflet-draw wrapper package's ESM build does `import Draw from "leaflet-draw"`,
// which Vite's rolldown-based dependency optimizer rejects (no default export actually exists),
// so the draw toolbar is wired up directly against the Leaflet API in PolygonEditor below
// instead of going through that wrapper.
import "leaflet-draw";
import { cellToBoundary, cellsToMultiPolygon, getHexagonEdgeLengthAvg, gridDisk, latLngToCell } from "h3-js";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import type { GeoJSONPolygon, Zone } from "../types";

// Leaflet's default marker icon references relative image paths that break once bundled by
// Vite — a well-known leaflet+bundler gotcha, not specific to this project.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (Leaflet.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
Leaflet.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Fallback view when there's no zone/context data to center on yet (no API key/geocoding
// available to do better) — New Delhi, consistent with the example used in hex-zone-geofencing.md.
const DEFAULT_CENTER: [number, number] = [28.6139, 77.209];
const FOCUSED_ZOOM = 14;
const FALLBACK_ZOOM = 4;

// Matches the backend's DEFAULT_RESOLUTION in src/utils/h3.js — city-block precision. The
// circle/radius draw tool snaps straight to this resolution's hex grid so the boundary you draw
// already matches what "Generate Hex Cells" would produce at the default resolution.
const ZONE_HEX_RESOLUTION = 9;

const CONTEXT_ZONE_STYLE: L.PathOptions = { color: "#94a3b8", weight: 1, fillOpacity: 0.08, dashArray: "4" };
const HEX_CELL_STYLE: L.PathOptions = { color: "#f59e0b", weight: 1, fillOpacity: 0.05 };
const DRAWN_POLYGON_STYLE: L.PathOptions = { color: "#6366f1", weight: 2, fillOpacity: 0.15 };

/** Parses a `polygon` (GeoJSON `{ type, coordinates }`, [lng,lat] pairs — either already an
 * object, as `Zone.polygon` comes back from the API, or its JSON-text form, as the map/advanced
 * textarea round-trip it through `ZoneFormState.polygon`) into Leaflet [lat,lng] ring positions.
 * Returns null for anything not yet a valid polygon (e.g. an in-progress textarea edit). */
function parsePolygonToLatLngs(polygon: GeoJSONPolygon | string | null | undefined): [number, number][] | null {
  try {
    const parsed = typeof polygon === "string" ? JSON.parse(polygon) : polygon;
    const ring = parsed?.coordinates?.[0];
    if (!Array.isArray(ring) || ring.length < 3) return null;
    return ring.map(([lng, lat]: [number, number]) => [lat, lng]);
  } catch {
    return null;
  }
}

/** Serializes a drawn/edited Leaflet polygon ring back to the GeoJSON `polygon` string the
 * backend expects — [lng,lat] pairs, first point repeated to close the ring. */
function latLngsToPolygonJson(latlngs: L.LatLng[]): string {
  const ring = latlngs.map((p) => [p.lng, p.lat]);
  if (ring.length && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
    ring.push(ring[0]);
  }
  return JSON.stringify({ type: "Polygon", coordinates: [ring] });
}

/** Snaps a drawn circle (center + radius in meters) to the H3 grid: finds the disk of hex
 * cells covering the radius, then dissolves them into a single outline — this is what gives
 * the "radius" tool its honeycomb-edged look instead of a smooth circle. Returns the outer
 * ring as Leaflet [lat,lng] positions, or null in the (practically unreachable, since a
 * disk always has at least a center cell) case the merge produces nothing. */
function circleToHexOutline(centerLat: number, centerLng: number, radiusMeters: number): [number, number][] | null {
  const centerCell = latLngToCell(centerLat, centerLng, ZONE_HEX_RESOLUTION);
  const edgeKm = getHexagonEdgeLengthAvg(ZONE_HEX_RESOLUTION, "km");
  const k = Math.max(1, Math.ceil(radiusMeters / 1000 / edgeKm));
  const cells = gridDisk(centerCell, k);
  // A single contiguous disk of cells dissolves into one outer ring with no holes — this is
  // the outer boundary of the first (only) polygon in the merged MultiPolygon.
  const outerRing = cellsToMultiPolygon(cells, false)[0]?.[0];
  return outerRing && outerRing.length >= 3 ? (outerRing as [number, number][]) : null;
}

function centroidOf(latlngs: [number, number][]): [number, number] | null {
  if (!latlngs.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  for (const [lat, lng] of latlngs) {
    sumLat += lat;
    sumLng += lng;
  }
  return [sumLat / latlngs.length, sumLng / latlngs.length];
}

function firstZoneCentroid(zones: Zone[]): [number, number] | null {
  for (const z of zones) {
    const latlngs = parsePolygonToLatLngs(z.polygon);
    const c = latlngs ? centroidOf(latlngs) : null;
    if (c) return c;
  }
  return null;
}

function ContextZoneOverlay({ zones }: { zones: Zone[] }) {
  return (
    <>
      {zones.map((z) => {
        const latlngs = parsePolygonToLatLngs(z.polygon);
        if (!latlngs) return null;
        return (
          <Polygon key={z.id} positions={latlngs} pathOptions={CONTEXT_ZONE_STYLE}>
            <Tooltip sticky>{z.name}</Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}

// ── place-name search ───────────────────────────────────────────────────────────────────────

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string]; // [south, north, west, east]
}

/** Search box overlaid on the map — geocodes via OpenStreetMap's free Nominatim API (matches
 * the no-API-key OSM/Leaflet choice for this feature) so an admin can jump to a city/place by
 * name instead of hunting for it by panning/zooming. Debounced and capped at 5 results to stay
 * well under Nominatim's public-instance usage policy (~1 request/second). */
function PlaceSearch() {
  const map = useMap();
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Leaflet swallows clicks/scroll on the map pane by default — without this, clicking or
  // scrolling inside the search box would pan/zoom the map underneath it instead.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    Leaflet.DomEvent.disableClickPropagation(el);
    Leaflet.DomEvent.disableScrollPropagation(el);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(trimmed)}`;
      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: NominatimResult[]) => {
          setResults(data);
          setIsOpen(true);
        })
        .catch(() => {});
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const selectResult = (r: NominatimResult) => {
    const [south, north, west, east] = r.boundingbox.map(Number);
    map.fitBounds([[south, west], [north, east]], { maxZoom: 15 });
    setQuery(r.display_name);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute left-14 top-2.5 z-1000 w-56 max-w-[calc(100%-4.5rem)]">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search a place…"
          className="h-8 pl-7 pr-7 text-xs bg-background shadow-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {isOpen && results.length > 0 && (
          <ul className="absolute mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-border bg-background shadow-md text-xs">
            {results.map((r, i) => (
              <li
                key={i}
                onClick={() => selectResult(r)}
                title={r.display_name}
                className="px-2.5 py-1.5 cursor-pointer hover:bg-accent truncate"
              >
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── polygon draw/edit ───────────────────────────────────────────────────────────────────────

interface PolygonEditorProps {
  value: string;
  onChange: (polygonJson: string) => void;
}

/** Owns the drawable FeatureGroup + toolbar. Lives inside <MapContainer> so it can call
 * useMap() to recenter once when an existing polygon is loaded (edit mode). */
function PolygonEditor({ value, onChange }: PolygonEditorProps) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  // Echoes our own onChange calls back through the `value` prop (parent state round-trip) —
  // this guards against re-drawing (and fighting an in-progress drag) on our own updates,
  // while still redrawing when `value` changes for a real external reason (dialog opened
  // with a different zone, or the advanced textarea was pasted into).
  const lastEmitted = useRef<string | null>(null);

  const emit = useCallback((json: string) => {
    lastEmitted.current = json;
    onChange(json);
  }, [onChange]);
  // Kept current every render so the stable draw-control effect below (mount/unmount only)
  // always calls the latest `emit` without needing to recreate the control on every change.
  const emitRef = useRef(emit);
  emitRef.current = emit;

  // Runs on mount (loads an existing zone's polygon as an editable layer) and whenever `value`
  // changes for a reason other than our own emit above (e.g. a paste into the advanced textarea).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const fg = featureGroupRef.current;
    if (!fg) return;
    fg.clearLayers();
    const latlngs = parsePolygonToLatLngs(value);
    if (latlngs) {
      Leaflet.polygon(latlngs, DRAWN_POLYGON_STYLE).addTo(fg);
      const c = centroidOf(latlngs);
      if (c) map.setView(c, FOCUSED_ZOOM);
    }
  }, [value, map]);

  // Attaches the Leaflet.draw toolbar directly to the map (see the leaflet-draw import note
  // above for why) — one control for the lifetime of this component, not re-created on every
  // value/onChange change.
  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;

    const drawControl = new Leaflet.Control.Draw({
      position: "topright",
      edit: { featureGroup: fg, remove: true },
      draw: {
        rectangle: false,
        // "Radius" tool — draw a center + drag out a radius, like picking a quick circular
        // zone, but the result gets snapped to the H3 hex grid instead of staying a smooth
        // circle (see handleCreated below).
        circle: { shapeOptions: DRAWN_POLYGON_STYLE },
        circlemarker: false,
        marker: false,
        polyline: false,
        polygon: { allowIntersection: false, showArea: true, shapeOptions: DRAWN_POLYGON_STYLE },
      },
    });
    map.addControl(drawControl);

    const handleCreated = (e: L.DrawEvents.Created) => {
      // A zone has exactly one boundary — replace, don't accumulate.
      fg.clearLayers();

      if (e.layerType === "circle") {
        const circle = e.layer as L.Circle;
        const center = circle.getLatLng();
        const outline = circleToHexOutline(center.lat, center.lng, circle.getRadius());
        if (!outline) return;
        const hexLayer = Leaflet.polygon(outline, DRAWN_POLYGON_STYLE);
        hexLayer.addTo(fg);
        emitRef.current(latLngsToPolygonJson(hexLayer.getLatLngs()[0] as L.LatLng[]));
        return;
      }

      fg.addLayer(e.layer);
      emitRef.current(latLngsToPolygonJson((e.layer as L.Polygon).getLatLngs()[0] as L.LatLng[]));
    };
    const handleEdited = (e: L.DrawEvents.Edited) => {
      e.layers.eachLayer((layer) => {
        emitRef.current(latLngsToPolygonJson((layer as L.Polygon).getLatLngs()[0] as L.LatLng[]));
      });
    };
    const handleDeleted = () => emitRef.current("");

    map.on(Leaflet.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
    map.on(Leaflet.Draw.Event.EDITED, handleEdited as L.LeafletEventHandlerFn);
    map.on(Leaflet.Draw.Event.DELETED, handleDeleted as L.LeafletEventHandlerFn);

    return () => {
      map.off(Leaflet.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
      map.off(Leaflet.Draw.Event.EDITED, handleEdited as L.LeafletEventHandlerFn);
      map.off(Leaflet.Draw.Event.DELETED, handleDeleted as L.LeafletEventHandlerFn);
      map.removeControl(drawControl);
    };
    // featureGroupRef.current is stable for the component's lifetime (react-leaflet attaches
    // the ref before children effects run) — map + the ref object identity are enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return <FeatureGroup ref={featureGroupRef} />;
}

export interface ZonePolygonMapProps {
  value: string;
  onChange: (polygonJson: string) => void;
  contextZones?: Zone[];
  hexCells?: string[] | null;
  height?: number | string;
}

/** Draw-a-polygon map: replaces hand-typed GeoJSON coordinates with an actual map — draw
 * the zone boundary, drag vertices to adjust, delete to start over. Shows other zones in the
 * same country (translucent) for spatial context, and the zone's own hex cells once generated. */
export function ZonePolygonMap({ value, onChange, contextZones = [], hexCells, height = 360 }: ZonePolygonMapProps) {
  const [initial] = useState<{ center: [number, number]; zoom: number }>(() => {
    const latlngs = parsePolygonToLatLngs(value);
    const ownCentroid = latlngs ? centroidOf(latlngs) : null;
    if (ownCentroid) return { center: ownCentroid, zoom: FOCUSED_ZOOM };
    const contextCentroid = firstZoneCentroid(contextZones);
    if (contextCentroid) return { center: contextCentroid, zoom: FOCUSED_ZOOM };
    return { center: DEFAULT_CENTER, zoom: FALLBACK_ZOOM };
  });

  return (
    <div style={{ height }} className="rounded-md overflow-hidden border border-border relative z-0">
      <MapContainer center={initial.center} zoom={initial.zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ContextZoneOverlay zones={contextZones} />
        {hexCells?.map((cell) => (
          <Polygon key={cell} positions={cellToBoundary(cell)} pathOptions={HEX_CELL_STYLE} />
        ))}
        <PolygonEditor value={value} onChange={onChange} />
        <PlaceSearch />
      </MapContainer>
    </div>
  );
}

// ── click-to-pick a point ───────────────────────────────────────────────────────────────────

function ClickToPick({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface ZonePointMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  contextZones?: Zone[];
  height?: number | string;
}

/** Click-anywhere-on-the-map point picker: replaces hand-typed lat/lng for the Detect Zone /
 * Resolve Hex tools. Shows other zones (translucent) so an admin can click "inside the airport
 * zone" visually instead of having to already know its coordinates. */
export function ZonePointMap({ lat, lng, onChange, contextZones = [], height = 320 }: ZonePointMapProps) {
  const hasPoint = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const [initial] = useState<{ center: [number, number]; zoom: number }>(() => {
    if (hasPoint) return { center: [lat as number, lng as number], zoom: FOCUSED_ZOOM };
    const contextCentroid = firstZoneCentroid(contextZones);
    if (contextCentroid) return { center: contextCentroid, zoom: FOCUSED_ZOOM - 2 };
    return { center: DEFAULT_CENTER, zoom: FALLBACK_ZOOM };
  });

  return (
    <div style={{ height }} className="rounded-md overflow-hidden border border-border relative z-0">
      <MapContainer center={initial.center} zoom={initial.zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ContextZoneOverlay zones={contextZones} />
        <PlaceSearch />
        <ClickToPick onChange={onChange} />
        {hasPoint && (
          <Marker
            position={[lat as number, lng as number]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = (e.target as L.Marker).getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
