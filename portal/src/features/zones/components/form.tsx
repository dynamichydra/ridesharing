import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, Wand2, MapPin, Sparkles } from "lucide-react";
import { parseGeoJSONPolygonInput } from "@/features/geo/utils";
import type { Country, Zone } from "../types";

export interface ZoneFormState {
  countryId: string;
  cityId?: string;
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
  onChange: (values: ZoneFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
  contextZones?: Zone[];
  hexCells?: string[] | null;
}

export default function ZoneForm({
  values,
  countries,
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

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 text-foreground">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-country">
            Country <span className="text-red-500">*</span>
          </Label>
          <select
            id="z-country"
            className="w-full flex h-10 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={values.countryId}
            onChange={(e) => onChange({ ...values, countryId: e.target.value })}
            required
          >
            <option value="" disabled>
              Select Country
            </option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-name">
            Zone Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="z-name"
            placeholder="e.g. Bengaluru Central Core"
            value={values.name}
            onChange={(e) => onChange({ ...values, name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-type">
            Zone Type <span className="text-red-500">*</span>
          </Label>
          <Input
            id="z-type"
            placeholder="e.g. city, airport, suburb, surge"
            value={values.type}
            onChange={(e) => onChange({ ...values, type: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-multiplier">
            Pricing Multiplier <span className="text-red-500">*</span>
          </Label>
          <Input
            id="z-multiplier"
            placeholder="e.g. 1.2"
            value={values.multiplier}
            onChange={(e) => onChange({ ...values, multiplier: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="z-airportFee">Airport Fee (₹)</Label>
          <Input
            id="z-airportFee"
            placeholder="0"
            value={values.airportFee}
            onChange={(e) => onChange({ ...values, airportFee: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="z-pickupFee">Pickup Fee (₹)</Label>
          <Input
            id="z-pickupFee"
            placeholder="0"
            value={values.pickupFee}
            onChange={(e) => onChange({ ...values, pickupFee: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="z-dropoffFee">Dropoff Fee (₹)</Label>
          <Input
            id="z-dropoffFee"
            placeholder="0"
            value={values.dropoffFee}
            onChange={(e) => onChange({ ...values, dropoffFee: e.target.value })}
          />
        </div>
      </div>

      {/* GeoJSON Polygon Coordinates Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="z-polygon">
              GeoJSON Polygon Coordinates <span className="text-red-500">*</span>
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
                <Wand2 className="h-3 w-3" /> Extract & Clean Polygon
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
          rows={6}
          className="font-mono text-xs max-h-48 resize-y border-border bg-background"
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
          Supports direct <code>Polygon</code>, <code>Feature</code>, or <code>FeatureCollection</code> exported from geojson.io, QGIS, or OSM.
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
