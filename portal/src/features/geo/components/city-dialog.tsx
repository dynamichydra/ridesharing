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
import type { City, Country, CityType } from "../types";

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
            timezone: city.timezone || "",
            sortOrder: String(city.sortOrder),
          }
        : {
            ...emptyCityFormValues,
            countryId: defaultCountryId || "",
            stateId: defaultStateId || "",
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
    const payload = {
      stateId: values.stateId,
      countryId: values.countryId,
      cityTypeId: values.cityTypeId || null,
      name: values.name,
      timezone: values.timezone || undefined,
      sortOrder: Number(values.sortOrder),
    };

    if (city) {
      updateMutation.mutate({ id: city.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{city ? "Edit City" : "Add City"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <CityForm form={form} countries={countries} states={states} cityTypes={cityTypes} />
          <DialogFooter className="pt-4">
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
              className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
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

