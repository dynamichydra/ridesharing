import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { citySchema, emptyCityFormValues, type CityFormValues } from "../schema";
import { CityForm } from "./city-form";
import { useCreateCity, useUpdateCity, useStates, useCityTypeOptions } from "../hooks";
import { parseGeoJSONPolygonInput } from "../utils";
import type { City, Country, CityType, CreateCityPayload } from "../types";

interface CityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: City | null;
  countries: Country[];
  cityTypes?: CityType[];
  defaultCountryId?: string;
  defaultStateId?: string;
}

export function CityFormDialog({
  open,
  onOpenChange,
  city,
  countries,
  cityTypes: passedCityTypes,
  defaultCountryId,
  defaultStateId,
}: CityFormDialogProps) {
  const createMutation = useCreateCity();
  const updateMutation = useUpdateCity();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: cityTypesData } = useCityTypeOptions();
  const cityTypes = passedCityTypes || cityTypesData?.MESSAGE || [];

  const form = useForm<CityFormValues>({
    resolver: zodResolver(citySchema),
    defaultValues: emptyCityFormValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      city
        ? {
            countryId: city.countryId,
            stateId: city.stateId,
            cityTypeId: city.cityTypeId || "",
            name: city.name,
            code: city.code || city.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
            currencyCode: city.currencyCode || "INR",
            timezone: city.timezone || "UTC",
            polygon: city.polygon ? JSON.stringify(city.polygon, null, 2) : "",
            resolution: city.resolution != null ? String(city.resolution) : "8",
            sortOrder: String(city.sortOrder ?? 0),
            isActive: city.isActive !== undefined ? city.isActive : true,
          }
        : {
            ...emptyCityFormValues,
            countryId: defaultCountryId || "",
            stateId: defaultStateId || "",
            isActive: true,
          },
    );
  }, [open, city, defaultCountryId, defaultStateId, form]);

  const selectedCountryId = form.watch("countryId");
  const { data: statesData } = useStates({
    countryId: selectedCountryId || undefined,
    limit: 100,
  });
  const states = selectedCountryId ? statesData?.MESSAGE ?? [] : [];

  const onSubmit = form.handleSubmit((values) => {
    let polygon = undefined;
    if (values.polygon && values.polygon.trim()) {
      const parsed = parseGeoJSONPolygonInput(values.polygon);
      if (parsed.polygon) {
        polygon = parsed.polygon;
      }
    }

    const payload: CreateCityPayload = {
      stateId: values.stateId,
      countryId: values.countryId,
      cityTypeId: values.cityTypeId || null,
      name: values.name,
      code: values.code,
      currencyCode: values.currencyCode || "INR",
      timezone: values.timezone || undefined,
      polygon,
      boundary: values.polygon || undefined,
      resolution: values.resolution ? parseInt(values.resolution, 10) : 8,
      sortOrder: Number(values.sortOrder),
      isActive: values.isActive,
    };

    if (city) {
      updateMutation.mutate({ id: city.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{city ? "Edit Operational City" : "Add Operational City"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <CityForm form={form} countries={countries} states={states} cityTypes={cityTypes} />
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
              disabled={isPending}
            >
              {city ? "Save Changes" : "Create City"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
