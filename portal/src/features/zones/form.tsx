import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import  { zoneSchema,type ZoneFormValues,  } from "./schema";
// import {zoneTypeOptions} from "./schema";

interface ZoneFormProps {
  formId: string;
  defaultValues: ZoneFormValues;
  onSubmit: (values: ZoneFormValues) => void;
}

// Shared form body reused for both create and edit (the dialog decides
// whether it's calling create or update on submit).
export function ZoneForm({ formId, defaultValues, onSubmit }: ZoneFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues,
  });

  // Re-sync whenever a different zone is opened for edit (or the dialog is
  // reopened for create with fresh empty defaults).
  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const isActive = watch("isActive");

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <form id={formId} onSubmit={submit} className="space-y-4 py-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            Zone Name <span className="text-red-500">*</span>
          </Label>
          <Input id="name" placeholder="e.g. Airport Zone" {...register("name")} />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Zone Category</Label>
          <select
            id="type"
            {...register("type")}
            className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="city">City Core</option>
            <option value="large_city">Large City Area</option>
            <option value="suburb">Suburb Boundary</option>
            <option value="airport">Airport Hub</option>
            <option value="highway">Highway Segment</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Remarks / Description</Label>
        <Input
          id="description"
          placeholder="Description of geographic boundaries"
          {...register("description")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 items-center">
        <div className="space-y-2">
          <Label htmlFor="multiplier">Surge Multiplier</Label>
          <Input id="multiplier" placeholder="e.g. 1.25" {...register("multiplier")} />
          {errors.multiplier && <p className="text-xs text-red-500">{errors.multiplier.message}</p>}
        </div>
        <div className="flex items-center gap-2 self-end h-10">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setValue("isActive", e.target.checked, { shouldDirty: true })}
            className="h-4 w-4 accent-primary rounded border-border"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Enable Service in Zone
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="polygon" className="flex items-center gap-1.5">
            Polygon GPS Coordinates (JSON Matrix) <span className="text-red-500">*</span>
          </Label>
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            <HelpCircle className="h-3 w-3" /> Array of [[[lng, lat], ...]]
          </span>
        </div>
        <Textarea
          id="polygon"
          rows={4}
          className="font-mono text-xs"
          placeholder="[[[88.34, 22.56], [88.39, 22.56], [88.39, 22.59], [88.34, 22.59], [88.34, 22.56]]]"
          {...register("coordinatesText")}
        />
        {errors.coordinatesText && (
          <p className="text-xs text-red-500">{errors.coordinatesText.message}</p>
        )}
      </div>
    </form>
  );
}