import { useState, useEffect } from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CheckCircle2, AlertCircle, Wand2, Sparkles, Map, Code2, Globe } from "lucide-react";
import { parseGeoJSONPolygonInput } from "../utils";
import { ServiceAreaMapDrawer } from "./service-area-map-drawer";
import type { CityFormValues } from "../schema";
import type { Country, State } from "../types";

interface CityFormProps {
  form: UseFormReturn<CityFormValues>;
  countries: Country[];
  states: State[];
}

export function CityForm({ form, countries, states }: CityFormProps) {
  const {
    register,
    control,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const [boundaryTab, setBoundaryTab] = useState<"map" | "json">("map");
  const [geoJsonInfo, setGeoJsonInfo] = useState<{
    valid: boolean;
    message?: string;
    pointsCount?: number;
    sourceType?: string;
  } | null>(null);

  const polygonValue = watch("polygon") || "";
  const nameValue = watch("name") || "";
  const codeValue = watch("code") || "";

  useEffect(() => {
    if (!polygonValue || !polygonValue.trim()) {
      setGeoJsonInfo(null);
      return;
    }
    const result = parseGeoJSONPolygonInput(polygonValue);
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
  }, [polygonValue]);

  const handleNormalize = () => {
    if (!polygonValue) return;
    const result = parseGeoJSONPolygonInput(polygonValue);
    if (result.polygon) {
      setValue("polygon", JSON.stringify(result.polygon, null, 2));
    }
  };

  const handleInsertSample = () => {
    const sample = {
      type: "Polygon",
      coordinates: [
        [
          [77.45, 12.85],
          [77.75, 12.85],
          [77.75, 13.15],
          [77.45, 13.15],
          [77.45, 12.85],
        ],
      ],
    };
    setValue("polygon", JSON.stringify(sample, null, 2));
  };

  return (
    <div className="space-y-4 py-2 text-foreground">
      {/* Country & State */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ct-countryId">
            Country <span className="text-red-500">*</span>
          </Label>
          <Controller
            name="countryId"
            control={control}
            render={({ field }) => (
              <NativeSelect
                id="ct-countryId"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue("stateId", "");
                  const matchedCountry = countries.find((c) => c.id === e.target.value);
                  if (matchedCountry?.currencyCode) {
                    setValue("currencyCode", matchedCountry.currencyCode);
                  }
                }}
              >
                <NativeSelectOption value="">Select country</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name} ({c.currencyCode})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
          {errors.countryId && (
            <p className="text-xs text-destructive">{errors.countryId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-stateId">
            State <span className="text-red-500">*</span>
          </Label>
          <NativeSelect id="ct-stateId" disabled={!states.length} {...register("stateId")}>
            <NativeSelectOption value="">
              {states.length ? "Select state" : "Select a country first"}
            </NativeSelectOption>
            {states.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.stateId && <p className="text-xs text-destructive">{errors.stateId.message}</p>}
        </div>
      </div>

      {/* City Name & Code */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ct-name">
            City Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ct-name"
            placeholder="e.g. Bengaluru"
            {...register("name", {
              onChange: (e) => {
                const val = e.target.value;
                if (!codeValue || codeValue === nameValue.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)) {
                  setValue("code", val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10));
                }
              },
            })}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-code">
            City Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="ct-code"
            placeholder="e.g. BLR"
            className="font-mono uppercase text-xs"
            {...register("code")}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>
      </div>

      {/* Currency, Timezone, Sort Order & Active Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="ct-currency">Currency Code</Label>
          <Input id="ct-currency" placeholder="e.g. INR, USD" className="font-mono uppercase text-xs" {...register("currencyCode")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-timezone">Timezone</Label>
          <Input id="ct-timezone" placeholder="e.g. Asia/Kolkata" className="text-xs" {...register("timezone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-sortOrder">Sort Order</Label>
          <Input id="ct-sortOrder" type="number" placeholder="e.g. 0" className="text-xs" {...register("sortOrder")} />
        </div>

        <div className="space-y-2 pb-1">
          <div className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-muted/20">
            <Label htmlFor="ct-isActive" className="text-xs font-medium cursor-pointer">
              Active Status
            </Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <input
                  id="ct-isActive"
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
              )}
            />
          </div>
        </div>
      </div>

      {/* Operational City Boundary Section */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <Label className="text-sm font-semibold">
              Operational City Boundary (Service Area)
            </Label>
            {geoJsonInfo && (
              geoJsonInfo.valid ? (
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] py-0 gap-1 font-normal"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {geoJsonInfo.pointsCount} vertices
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

          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setBoundaryTab("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                boundaryTab === "map"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              Draw on Map
            </button>
            <button
              type="button"
              onClick={() => setBoundaryTab("json")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                boundaryTab === "json"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Paste JSON
            </button>
          </div>
        </div>

        {/* Map tab */}
        {boundaryTab === "map" && (
          <ServiceAreaMapDrawer
            polygonJson={polygonValue}
            onPolygonChange={(json) => setValue("polygon", json)}
            hint="Draw the full operating perimeter polygon of this city. All rides and special zones will reside inside this boundary."
          />
        )}

        {/* JSON tab */}
        {boundaryTab === "json" && (
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-3">
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

            <Textarea
              id="ct-polygon"
              rows={6}
              className="font-mono text-xs max-h-48 resize-y border-border bg-background"
              placeholder='Paste GeoJSON Polygon, Feature, or FeatureCollection here...'
              value={polygonValue}
              onChange={(e) => setValue("polygon", e.target.value)}
            />

            {geoJsonInfo && !geoJsonInfo.valid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {geoJsonInfo.message}
              </p>
            )}
          </div>
        )}

        {/* H3 Resolution */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="ct-resolution" className="text-xs">H3 Index Resolution</Label>
            <NativeSelect id="ct-resolution" {...register("resolution")} className="font-mono text-xs h-8">
              <NativeSelectOption value="8">Res 8 (~0.7 km² per cell - Recommended)</NativeSelectOption>
              <NativeSelectOption value="9">Res 9 (~0.1 km² precision)</NativeSelectOption>
              <NativeSelectOption value="10">Res 10 (~0.015 km² high precision)</NativeSelectOption>
            </NativeSelect>
          </div>
        </div>
      </div>
    </div>
  );
}
