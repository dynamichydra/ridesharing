import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CountryFormValues } from "../schema";
import type { Currency } from "../types";

interface CountryFormProps {
  form: UseFormReturn<CountryFormValues>;
  currencies?: Currency[];
}

export function CountryForm({ form, currencies = [] }: CountryFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="c-name">Country Name</Label>
          <Input id="c-name" placeholder="e.g. India" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-isoCode">ISO Code</Label>
          <Input id="c-isoCode" placeholder="e.g. IN" maxLength={2} {...register("isoCode")} />
          {errors.isoCode && <p className="text-xs text-destructive">{errors.isoCode.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="c-dialCode">Dial Code</Label>
          <Input id="c-dialCode" placeholder="e.g. +91" {...register("dialCode")} />
          {errors.dialCode && <p className="text-xs text-destructive">{errors.dialCode.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-currencyCode">Currency</Label>
          {currencies.length > 0 ? (
            <NativeSelect id="c-currencyCode" {...register("currencyCode")}>
              <NativeSelectOption value="">Select currency</NativeSelectOption>
              {currencies.map((cur) => (
                <NativeSelectOption key={cur.id} value={cur.code}>
                  {cur.code} - {cur.name} ({cur.symbol})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <Input
              id="c-currencyCode"
              placeholder="e.g. INR"
              maxLength={3}
              {...register("currencyCode")}
            />
          )}
          {errors.currencyCode && (
            <p className="text-xs text-destructive">{errors.currencyCode.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="c-defaultLanguageCode">Default Language (Optional)</Label>
          <Input
            id="c-defaultLanguageCode"
            placeholder="e.g. en"
            {...register("defaultLanguageCode")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-timezone">Timezone</Label>
          <Input id="c-timezone" placeholder="e.g. Asia/Kolkata" {...register("timezone")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="c-roundingIncrementMinor">Fare Rounding (minor units)</Label>
          <Input
            id="c-roundingIncrementMinor"
            type="number"
            placeholder="e.g. 1"
            {...register("roundingIncrementMinor")}
          />
          {errors.roundingIncrementMinor && (
            <p className="text-xs text-destructive">{errors.roundingIncrementMinor.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="c-sortOrder">Sort Order</Label>
          <Input id="c-sortOrder" type="number" placeholder="e.g. 0" {...register("sortOrder")} />
          {errors.sortOrder && (
            <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
          )}
        </div>
      </div>

      <Controller
        name="isDefault"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2 pt-2">
            <input
              id="c-isDefault"
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-border"
            />
            <Label htmlFor="c-isDefault" className="cursor-pointer">
              Fallback country for unresolved pickup points
            </Label>
          </div>
        )}
      />
    </div>
  );
}
