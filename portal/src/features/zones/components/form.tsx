import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { ZonePolygonMap, ZonePointMap } from "./zone-map";
import type { Country, Zone } from "../types";

export interface ZoneFormState {
  countryId: string;
  name: string;
  type: string;
  multiplier: string;
  polygon: string;
  description: string;
  // H3 hex-cell resolution (8-10) — leave blank to leave hex indexing untouched.
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
  // Other active zones (usually scoped to the selected country) drawn translucent on the map
  // for spatial context, and the zone's own hex cells once generated (edit mode only).
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
  contextZones,
  hexCells,
}: ZoneFormProps) {
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
            <option value="" disabled>Select Country</option>
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
            placeholder="e.g. Downtown Core"
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
            placeholder="e.g. city, airport, suburb"
            value={values.type}
            onChange={(e) => onChange({ ...values, type: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="z-multiplier">
            Multiplier <span className="text-red-500">*</span>
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>
            Zone Boundary <span className="text-red-500">*</span>
          </Label>
          {!values.polygon && (
            <span className="text-xs text-amber-600 dark:text-amber-400">Draw a boundary below</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Click the polygon tool (top-right of the map), then click to place each vertex and
          click the first vertex again to close the shape. Or use the circle tool to click a
          center and drag out a radius — it snaps to the H3 hex grid automatically instead of
          staying a smooth circle. Drag a vertex to adjust, use the trash tool to clear and redraw.
        </p>
        <ZonePolygonMap
          value={values.polygon}
          onChange={(polygon) => onChange({ ...values, polygon })}
          contextZones={contextZones}
          hexCells={hexCells}
        />
        <details className="text-xs group">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
            Advanced: paste raw GeoJSON instead (e.g. an OpenStreetMap export)
          </summary>
          <Textarea
            id="z-polygon"
            placeholder='{"type":"Polygon","coordinates":[[[lng,lat], ...]]}'
            className="font-mono text-xs border-border bg-background mt-2"
            rows={3}
            value={values.polygon}
            onChange={(e) => onChange({ ...values, polygon: e.target.value })}
          />
        </details>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="z-resolution">H3 Resolution</Label>
          <Input
            id="z-resolution"
            type="number"
            min={8}
            max={10}
            placeholder="9"
            value={values.resolution}
            onChange={(e) => onChange({ ...values, resolution: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Hex cells are (re)generated from the polygon automatically when you save — 8 (~461m),
            9 (~174m, city-block), 10 (~65m). Clear this field to leave hex indexing untouched.
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
          <p className="text-xs text-muted-foreground">
            Higher wins when a point matches multiple hex zones (e.g. airport over city surge).
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
          {submitLabel}
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
  // Priority-ordered H3 hex-zone matches (most specific first) — additive alongside the
  // polygon-based `detectedZoneName` result above; undefined = not looked up yet.
  hexMatches?: Zone[];
  // Existing zones drawn translucent on the map so an admin can click "inside the airport
  // zone" visually instead of needing to already know its coordinates.
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
  contextZones,
}: ZoneDetectFormProps) {
  const lat = values.lat ? parseFloat(values.lat) : null;
  const lng = values.lng ? parseFloat(values.lng) : null;

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 text-foreground">
      <div className="space-y-2">
        <Label>Point to Check</Label>
        <p className="text-xs text-muted-foreground">
          Click anywhere on the map, or drag the marker, to set the coordinate.
        </p>
        <ZonePointMap
          lat={lat}
          lng={lng}
          onChange={(newLat, newLng) => onChange({ lat: String(newLat), lng: String(newLng) })}
          contextZones={contextZones}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="d-lat" className="text-xs text-muted-foreground">Latitude</Label>
          <Input
            id="d-lat"
            placeholder="e.g. 40.7128"
            className="font-mono text-xs h-8"
            value={values.lat}
            onChange={(e) => onChange({ ...values, lat: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="d-lng" className="text-xs text-muted-foreground">Longitude</Label>
          <Input
            id="d-lng"
            placeholder="e.g. -74.0060"
            className="font-mono text-xs h-8"
            value={values.lng}
            onChange={(e) => onChange({ ...values, lng: e.target.value })}
            required
          />
        </div>
      </div>

      {detectedZoneName !== undefined && (
        <div className="rounded-lg border border-border p-4 bg-muted/40 text-center">
          <span className="text-xs text-muted-foreground block uppercase font-semibold tracking-wider mb-1">
            Detection Outcome
          </span>
          {detectedZoneName ? (
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Matches Inside Zone: <span className="underline">{detectedZoneName}</span>
            </p>
          ) : (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Outside all operational zones.
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
              No hex zone matches this point.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {hexMatches.map((z) => (
                <li
                  key={z.id}
                  className="flex items-center justify-between text-sm bg-background rounded-md border border-border px-3 py-1.5"
                >
                  <span className="font-medium text-foreground">{z.name}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{z.type}</span>
                    <span className="font-mono bg-muted px-1.5 py-0.5 rounded">priority {z.priority}</span>
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
        <Input
          id="gh-resolution"
          type="number"
          min={8}
          max={10}
          placeholder="9"
          value={values.resolution}
          onChange={(e) => onChange({ resolution: e.target.value })}
          required
        />
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
