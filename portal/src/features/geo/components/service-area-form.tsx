import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Wand2 } from "lucide-react";
import { parseGeoJSONPolygonInput } from "../utils";
import type { ServiceAreaFormValues } from "../schema";
import type { City, Country } from "../types";

interface ServiceAreaFormProps {
  form: UseFormReturn<ServiceAreaFormValues>;
  cities: City[];
  countries?: Country[];
  isEditing?: boolean;
}

export function ServiceAreaForm({ form, cities }: ServiceAreaFormProps) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const [geoJsonInfo, setGeoJsonInfo] = useState<{
    valid: boolean;
    message?: string;
    pointsCount?: number;
    sourceType?: string;
  } | null>(null);

  const polygonVal = watch("polygon");

  useEffect(() => {
    if (!polygonVal || !polygonVal.trim()) {
      setGeoJsonInfo(null);
      return;
    }
    const result = parseGeoJSONPolygonInput(polygonVal);
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
  }, [polygonVal]);

  const handleNormalize = () => {
    if (!polygonVal) return;
    const result = parseGeoJSONPolygonInput(polygonVal);
    if (result.polygon) {
      setValue("polygon", JSON.stringify(result.polygon, null, 2), { shouldValidate: true });
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
    setValue("polygon", JSON.stringify(sample, null, 2), { shouldValidate: true });
  };

  return (
    <div className="space-y-4 py-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sa-name">
            Service Area Name <span className="text-destructive">*</span>
          </Label>
          <Input id="sa-name" placeholder="e.g. Bengaluru Central & Tech Parks" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-city">
            Assigned City <span className="text-destructive">*</span>
          </Label>
          <NativeSelect id="sa-city" {...register("cityId")}>
            <NativeSelectOption value="">Select a city</NativeSelectOption>
            {cities.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {errors.cityId && <p className="text-xs text-destructive">{errors.cityId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="sa-status">Operational Status</Label>
          <NativeSelect id="sa-status" {...register("status")}>
            <NativeSelectOption value="ACTIVE">ACTIVE (Accepting Bookings)</NativeSelectOption>
            <NativeSelectOption value="INACTIVE">INACTIVE (Temporarily Closed)</NativeSelectOption>
            <NativeSelectOption value="RESTRICTED">RESTRICTED (Curfew / High Demand Only)</NativeSelectOption>
          </NativeSelect>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sa-res">H3 Hex Index Resolution</Label>
          <NativeSelect id="sa-res" {...register("resolution")}>
            <NativeSelectOption value="8">Res 8 (~0.7 km² per cell)</NativeSelectOption>
            <NativeSelectOption value="9">Res 9 (~0.1 km² per cell - Recommended)</NativeSelectOption>
            <NativeSelectOption value="10">Res 10 (~0.015 km² high precision)</NativeSelectOption>
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="sa-poly">
              GeoJSON Polygon Coordinates <span className="text-destructive">*</span>
            </Label>
            {geoJsonInfo && (
              geoJsonInfo.valid ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] py-0 gap-1 font-normal">
                  <CheckCircle2 className="h-3 w-3" />
                  {geoJsonInfo.pointsCount} points {geoJsonInfo.sourceType && geoJsonInfo.sourceType !== "Polygon" ? `(${geoJsonInfo.sourceType} detected)` : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] py-0 gap-1 font-normal">
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
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Insert Sample
            </button>
          </div>
        </div>

        <Textarea
          id="sa-poly"
          rows={6}
          className="font-mono text-xs max-h-48 resize-y"
          placeholder='Paste Polygon, Feature, or FeatureCollection GeoJSON here...'
          {...register("polygon")}
        />

        {geoJsonInfo && !geoJsonInfo.valid && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {geoJsonInfo.message}
          </p>
        )}
        {errors.polygon && <p className="text-xs text-destructive">{errors.polygon.message}</p>}

        <p className="text-[11px] text-muted-foreground">
          Supports direct <code>Polygon</code>, <code>Feature</code>, or <code>FeatureCollection</code> from geojson.io, QGIS, or OSM.
        </p>
      </div>
    </div>
  );
}
