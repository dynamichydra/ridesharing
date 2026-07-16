import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { Country } from "../types";

export interface ZoneFormState {
  countryId: string;
  name: string;
  type: string;
  multiplier: string;
  polygon: string;
  description: string;
}

interface ZoneFormProps {
  values: ZoneFormState;
  countries: Country[];
  onChange: (values: ZoneFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
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
        <Label htmlFor="z-polygon">
          Polygon Coordinates <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="z-polygon"
          placeholder="[[lng, lat], [lng, lat], ...]"
          className="font-mono text-xs border-border bg-background"
          rows={3}
          value={values.polygon}
          onChange={(e) => onChange({ ...values, polygon: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">Coordinates formatted as nested GeoJSON arrays.</p>
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
}

export function ZoneDetectForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  detectedZoneName,
}: ZoneDetectFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3 text-foreground">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="d-lat">Latitude</Label>
          <Input
            id="d-lat"
            placeholder="e.g. 40.7128"
            value={values.lat}
            onChange={(e) => onChange({ ...values, lat: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-lng">Longitude</Label>
          <Input
            id="d-lng"
            placeholder="e.g. -74.0060"
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
