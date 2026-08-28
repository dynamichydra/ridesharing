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
import { countrySchema, emptyCountryFormValues, type CountryFormValues } from "../schema";
import { CountryForm } from "./country-form";
import { useCreateCountry, useUpdateCountry, useCurrencyOptions } from "../hooks";
import type { Country, Currency } from "../types";

interface CountryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country: Country | null;
  currencies?: Currency[];
}

export function CountryFormDialog({ open, onOpenChange, country, currencies: passedCurrencies }: CountryFormDialogProps) {
  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: currenciesData } = useCurrencyOptions();
  const currencies = passedCurrencies || currenciesData?.MESSAGE || [];

  const form = useForm<CountryFormValues>({
    resolver: zodResolver(countrySchema),
    defaultValues: emptyCountryFormValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      country
        ? {
            name: country.name,
            isoCode: country.isoCode,
            dialCode: country.dialCode,
            currencyCode: country.currencyCode,
            defaultLanguageCode: country.defaultLanguageCode || "",
            timezone: country.timezone || "",
            roundingIncrementMinor: String(country.roundingIncrementMinor),
            sortOrder: String(country.sortOrder),
            isDefault: country.isDefault,
          }
        : emptyCountryFormValues,
    );
  }, [open, country, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = {
      ...values,
      defaultLanguageCode: values.defaultLanguageCode || undefined,
      timezone: values.timezone || undefined,
      roundingIncrementMinor: Number(values.roundingIncrementMinor),
      sortOrder: Number(values.sortOrder),
    };

    if (country) {
      updateMutation.mutate(
        { id: country.id, payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{country ? "Edit Country" : "Add Country"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <CountryForm form={form} currencies={currencies} />
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
              {country ? "Save Changes" : "Create Country"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
