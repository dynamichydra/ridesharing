import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Wand2, MapPin, Sparkles, ShieldAlert, Info } from "lucide-react";
import { parseGeoJSONPolygonInput } from "@/features/geo/utils";
import type { Country, City, CityServiceArea, Zone } from "../types";

export interface ZoneFormState {
  countryId: string;
  cityId: string;
  name: string;
  type: string;
  multiplier: string;
  airportFee: string;
  pickupFee: string;
  dropoffFee: string;
  polygon: string;
  description: string;
  resolution: string;
  priority: string;
}

interface ZoneFormProps {
  values: ZoneFormState;
  countries: Country[];
  cities?: City[];
  serviceAreas?: CityServiceArea[];
  isLoadingCities?: boolean;
  isLoadingServiceAreas?: boolean;
  onChange: (values: ZoneFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  contextZones?: Zone[];
  hexCells?: string[] | null;
}

const SPECIAL_ZONE_PRESETS = [
  { value: "airport", label: "✈️ Airport Hub (Flight arrival/departure surcharges & surge)" },
  { value: "college", label: "🎓 College / University Campus (Student transit area)" },
  { value: "station", label: "🚆 Transit Station (Railway / Metro / Central bus terminal)" },
  { value: "tech_park", label: "🏢 Tech Park / Business District (Peak office commute corridor)" },
  { value: "surge", label: "⚡ High-Demand Surge Hub (Localized surge pricing)" },
  { value: "restricted", label: "🚫 Restricted Geofence (Prohibited zone — blocks rides entirely)" },
  { value: "custom", label: "🏷️ Custom Special Area" },
];

export default function ZoneForm({
  values,
  countries,
  cities = [],
  serviceAreas = [],
  isLoadingCities = false,
  isLoadingServiceAreas = false,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: ZoneFormProps) {
  const [geoJsonInfo, setGeoJsonInfo] = useState<{
    valid: boolean;
    message?: string;
    pointsCount?: number;
    sourceType?: string;
  } | null>(null);

  const [isCustomType, setIsCustomType] = useState(
    Boolean(values.type && !SPECIAL_ZONE_PRESETS.some((p) => p.value === values.type))
  );

  const filteredCities = useMemo(() => {
    if (!values.countryId) return cities;
    return cities.filter((c) => c.countryId === values.countryId);
  }, [cities, values.countryId]);

  const activeServiceArea = useMemo(() => {
    return serviceAreas.find((sa) => sa.status === "ACTIVE" || sa.isActive) || serviceAreas[0] || null;
  }, [serviceAreas]);

  useEffect(() => {
    if (!values.polygon || !values.polygon.trim()) {
      setGeoJsonInfo(null);
      return;
    }
    const result = parseGeoJSONPolygonInput(values.polygon);
    if (result.error) {
      setGeoJsonInfo({ valid: false, message: result.error });
    } else if (result.polygon) {
      const points = result.polygon.coordinates[0]?.length ?? 0;
      setGeoJsonInfo({
        valid: true,
        pointsCount: points,
        sourceType: result.sourceType,
      });
    }
  }, [values.polygon]);

  const handleNormalize = () => {
    if (!values.polygon) return;
    const result = parseGeoJSONPolygonInput(values.polygon);
    if (result.polygon) {
      onChange({ ...values, polygon: JSON.stringify(result.polygon, null, 2) });
    }
  };

  const handleInsertSample = () => {
    const sample = {
      type: "Polygon",
      coordinates: [
        [
          [77.58, 12.96],
          [77.62, 12.96],
          [77.62, 13.01],
          [77.58, 13.01],
          [77.58, 12.96],
        ],
      ],
    };
    onChange({ ...values, polygon: JSON.stringify(sample, null, 2) });
  };

  const handleUseServiceAreaTemplate = () => {
    if (!activeServiceArea?.polygon) return;
    onChange({
      ...values,
      polygon: JSON.stringify(activeServiceArea.polygon, null, 2),
    });
  };

  const isRestricted = values.type === "restricted";

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-2 text-foreground">
      {/* 2-Tier Spatial Hierarchy Guide */}
      <div className="rounded-lg border border-border/80 bg-muted/40 p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>Special Zone Architecture (2-Tier Spatial Model)</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          <strong>1. City Service Area</strong> defines the macro operational perimeter where riders request rides and drivers go online (configured in <em>Geo &gt; Service Areas</em>).
          <br />
          <strong>2. Special Zones</strong> (Airport, College, Station, Tech Park) sit <em>inside</em> the City Service Area for localized <strong>Fare Multipliers &amp; Surcharges</strong>. If a city has no special zones, standard baseline fares apply automatically based on city economic tier.
        </p>
      </div>

      {/* Country & City Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-country">
            Country <span className="text-red-500">*</span>
          </Label>
          <select
            id="z-country"
            className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.countryId}
            onChange={(e) => {
              onChange({ ...values, countryId: e.target.value, cityId: "" });
            }}
            required
          >
            <option value="" disabled>
              Select Country
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.currencyCode})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-city">
            City <span className="text-red-500">*</span>
          </Label>
          <select
            id="z-city"
            className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.cityId}
            onChange={(e) => onChange({ ...values, cityId: e.target.value })}
            disabled={!values.countryId || isLoadingCities}
            required
          >
            <option value="">
              {!values.countryId
                ? "Select Country first"
                : isLoadingCities
                ? "Loading cities..."
                : "Select City"}
            </option>
            {filteredCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* City Service Area Status for the Selected City */}
      {values.cityId && (
        <div>
          {isLoadingServiceAreas ? (
            <p className="text-xs text-muted-foreground italic">Checking active City Service Area...</p>
          ) : activeServiceArea ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Active City Service Area: <strong>{activeServiceArea.name}</strong> ({activeServiceArea.status})
              </span>
              {activeServiceArea.polygon && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseServiceAreaTemplate}
                  className="h-7 text-[11px] bg-background hover:bg-muted font-normal cursor-pointer gap-1 shrink-0"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  Use Boundary as Template
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 flex items-start gap-2 text-xs">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-amber-800 dark:text-amber-300">
                  No Active City Service Area Found
                </span>
                <p className="text-muted-foreground text-[11px]">
                  Special zones must be located inside an active City Service Area. Please create an operational service area in <strong>Geo &gt; Service Areas</strong> before saving this zone.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zone Name & Preset Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-name">
            Special Zone Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="z-name"
            placeholder="e.g. Kempegowda Intl Airport / IIT Campus"
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-type-select">
            Special Zone Category <span className="text-red-500">*</span>
          </Label>
          <select
            id="z-type-select"
            className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={isCustomType ? "custom" : values.type || "airport"}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "custom") {
                setIsCustomType(true);
                onChange({ ...values, type: "" });
              } else {
                setIsCustomType(false);
                onChange({ ...values, type: val });
              }
            }}
            required
          >
            {SPECIAL_ZONE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isCustomType && (
        <div className="space-y-2">
          <Label htmlFor="z-custom-type">
            Custom Zone Type Identifier <span className="text-red-500">*</span>
          </Label>
          <Input
            id="z-custom-type"
            placeholder="e.g. stadium, hospital_district, tourist_precinct"
            value={values.type}
            onChange={(e) => onChange({ ...values, type: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
            required
          />
        </div>
      )}

      {/* Restricted Geofence Notice */}
      {isRestricted ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 flex items-center gap-2 text-xs text-destructive">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>
            <strong>Restricted Zone Selected:</strong> Pickup and drop-off requests inside this perimeter are strictly rejected. Pricing multipliers and fees do not apply.
          </span>
        </div>
      ) : (
        <>
          {/* Pricing Multiplier */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="z-multiplier">
                Zone Pricing Multiplier <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Base fare factor (e.g. 1.25 = +25% surge)
              </span>
            </div>
            <Input
              id="z-multiplier"
              placeholder="1.0"
              value={values.multiplier}
              onChange={(e) => onChange({ ...values, multiplier: e.target.value })}
              required
            />
            <p className="text-[11px] text-muted-foreground">
              Applied to metered ride fare inside this zone. If no special zone exists at a location, the multiplier automatically falls back to the city type economic index.
            </p>
          </div>

          {/* Surcharges */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`space-y-2 ${values.type === "airport" ? "rounded-md p-2 bg-primary/5 border border-primary/20" : ""}`}>
              <Label htmlFor="z-airportFee" className="text-xs">
                Airport Fee (₹ / $)
              </Label>
              <Input
                id="z-airportFee"
                placeholder="0"
                value={values.airportFee}
                onChange={(e) => onChange({ ...values, airportFee: e.target.value })}
              />
              {values.type === "airport" && (
                <span className="text-[10px] text-primary block">Fixed airport access charge</span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="z-pickupFee" className="text-xs">Pickup Surcharge</Label>
              <Input
                id="z-pickupFee"
                placeholder="0"
                value={values.pickupFee}
                onChange={(e) => onChange({ ...values, pickupFee: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="z-dropoffFee" className="text-xs">Dropoff Surcharge</Label>
              <Input
                id="z-dropoffFee"
                placeholder="0"
                value={values.dropoffFee}
                onChange={(e) => onChange({ ...values, dropoffFee: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {/* GeoJSON Polygon Coordinates Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="z-polygon">
              Special Zone Polygon Coordinates <span className="text-red-500">*</span>
            </Label>
            {geoJsonInfo && (
              geoJsonInfo.valid ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] py-0 gap-1 font-normal"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {geoJsonInfo.pointsCount} points{" "}
                  {geoJsonInfo.sourceType && geoJsonInfo.sourceType !== "Polygon"
                    ? `(${geoJsonInfo.sourceType} detected)`
                    : ""}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] py-0 gap-1 font-normal"
                >
                  <AlertCircle className="h-3 w-3" /> Invalid GeoJSON
                </Badge>
              )
            )}
          </div>
          <div className="flex items-center gap-3">
            {geoJsonInfo?.valid && geoJsonInfo.sourceType && geoJsonInfo.sourceType !== "Polygon" && (
              <button
                type="button"
                onClick={handleNormalize}
                className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
              >
                <Wand2 className="h-3 w-3" /> Extract &amp; Clean Polygon
              </button>
            )}
            <button
              type="button"
              onClick={handleInsertSample}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="h-3 w-3" /> Insert Sample
            </button>
          </div>
        </div>

        <Textarea
          id="z-polygon"
          rows={5}
          className="font-mono text-xs max-h-40 resize-y border-border bg-background"
          placeholder='Paste Polygon, Feature, or FeatureCollection GeoJSON here...'
          value={values.polygon}
          onChange={(e) => onChange({ ...values, polygon: e.target.value })}
          required
        />

        {geoJsonInfo && !geoJsonInfo.valid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {geoJsonInfo.message}
          </p>
        )}

        <p className="text-[11px] text-muted-foreground">
          Must be enclosed entirely within the selected city's active City Service Area. Supports direct <code>Polygon</code>, <code>Feature</code>, or <code>FeatureCollection</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-resolution">H3 Resolution</Label>
          <select
            id="z-resolution"
            className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
            value={values.resolution}
            onChange={(e) => onChange({ ...values, resolution: e.target.value })}
          >
            <option value="8">Res 8 (~0.7 km² per cell)</option>
            <option value="9">Res 9 (~0.1 km² per cell - Recommended)</option>
            <option value="10">Res 10 (~0.015 km² high precision)</option>
          </select>
          <p className="text-[11px] text-muted-foreground">
            Hex cells are automatically (re)generated from the GeoJSON polygon when you save.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-priority">Overlap Priority</Label>
          <Input
            id="z-priority"
            type="number"
            min={1}
            placeholder="1"
            value={values.priority}
            onChange={(e) => onChange({ ...values, priority: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            Higher number wins when a point matches multiple hex zones (e.g. airport over city).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="z-desc">Description (Optional)</Label>
        <Textarea
          id="z-desc"
          placeholder="e.g. Core commercial region limits"
          className="border-border bg-background"
          rows={2}
          value={values.description}
          onChange={(e) => onChange({ ...values, description: e.target.value })}
        />
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

export interface ZoneDetectFormState {
  lat: string;
  lng: string;
}

interface ZoneDetectFormProps {
  values: ZoneDetectFormState;
  onChange: (values: ZoneDetectFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  detectedZoneName?: string | null;
  hexMatches?: Zone[];
  contextZones?: Zone[];
}

export function ZoneDetectForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  detectedZoneName,
  hexMatches,
}: ZoneDetectFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 text-foreground">
      <div className="rounded-lg border border-border/80 bg-muted/20 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" /> Enter Coordinates to Evaluate
        </div>
        <p className="text-xs text-muted-foreground">
          Check if a GPS coordinate falls inside any active operational geofence or H3 index zone.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <Label htmlFor="d-lat" className="text-xs text-muted-foreground">
              Latitude <span className="text-red-500">*</span>
            </Label>
            <Input
              id="d-lat"
              placeholder="e.g. 12.9716"
              className="font-mono text-xs h-9 bg-background"
              value={values.lat}
              onChange={(e) => onChange({ ...values, lat: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="d-lng" className="text-xs text-muted-foreground">
              Longitude <span className="text-red-500">*</span>
            </Label>
            <Input
              id="d-lng"
              placeholder="e.g. 77.5946"
              className="font-mono text-xs h-9 bg-background"
              value={values.lng}
              onChange={(e) => onChange({ ...values, lng: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {detectedZoneName !== undefined && (
        <div className="rounded-lg border border-border p-4 bg-muted/40 text-center space-y-1">
          <span className="text-[11px] text-muted-foreground block uppercase font-semibold tracking-wider">
            Polygon Geofence Match
          </span>
          {detectedZoneName ? (
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              Matches Inside: <span className="underline">{detectedZoneName}</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Outside all operational zone polygons.
            </p>
          )}
        </div>
      )}

      {hexMatches !== undefined && (
        <div className="rounded-lg border border-border p-4 bg-muted/40">
          <span className="text-xs text-muted-foreground block uppercase font-semibold tracking-wider mb-2 text-center">
            H3 Hex-Zone Matches (Priority Order)
          </span>
          {hexMatches.length === 0 ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 text-center">
              No H3 hex zone matches this point.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hexMatches.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between text-sm bg-background rounded-md border border-border px-3 py-2"
                >
                  <span className="font-semibold text-foreground">{z.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize text-[11px]">
                      {z.type}
                    </Badge>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                      priority {z.priority}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Close
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          {isPending ? "Evaluating..." : "Evaluate Coordinates"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export interface GenerateHexFormState {
  resolution: string;
}

interface GenerateHexFormProps {
  zone: Zone;
  values: GenerateHexFormState;
  onChange: (values: GenerateHexFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function GenerateHexForm({
  zone,
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
}: GenerateHexFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 text-foreground">
      <div className="rounded-lg border border-border p-3 bg-muted/40 text-sm">
        <p className="text-muted-foreground">
          Current index:{" "}
          {zone.resolution != null ? (
            <span className="text-foreground font-medium">
              resolution {zone.resolution} · {zone.hexCells?.length ?? 0} cells
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">not generated yet</span>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gh-resolution">
          H3 Resolution <span className="text-red-500">*</span>
        </Label>
        <select
          id="gh-resolution"
          className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
          value={values.resolution}
          onChange={(e) => onChange({ resolution: e.target.value })}
          required
        >
          <option value="8">Res 8 (~0.7 km² per cell)</option>
          <option value="9">Res 9 (~0.1 km² per cell - Recommended)</option>
          <option value="10">Res 10 (~0.015 km² high precision)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Re-derives hexCells from the zone's stored polygon at this resolution — safe to re-run any time.
        </p>
      </div>

      <DialogFooter className="pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
        >
          {isPending ? "Generating..." : "Generate Hex Cells"}
        </Button>
      </DialogFooter>
    </form>
  );
}
