import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CityFormValues } from "../schema";
import type { Country, State, CityType } from "../types";

interface CityFormProps {
  form: UseFormReturn<CityFormValues>;
  countries: Country[];
  states: State[];
  cityTypes?: CityType[];
}

export function CityForm({ form, countries, states, cityTypes = [] }: CityFormProps) {
  const {
    register,
    control,
    setValue,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ct-countryId">Country</Label>
          <Controller
            name="countryId"
            control={control}
            render={({ field }) => (
              <NativeSelect
                id="ct-countryId"
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  // Changing the country invalidates whatever state was picked before.
                  setValue("stateId", "");
                }}
              >
                <NativeSelectOption value="">Select country</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
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
          <Label htmlFor="ct-stateId">State</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ct-name">City Name</Label>
          <Input id="ct-name" placeholder="e.g. Bengaluru" {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-type">City Type / Tier</Label>
          <NativeSelect id="ct-type" {...register("cityTypeId")}>
            <NativeSelectOption value="">None / Standard</NativeSelectOption>
            {cityTypes.map((t) => (
              <NativeSelectOption key={t.id} value={t.id}>
                {t.name} ({t.code})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ct-timezone">Timezone (Optional)</Label>
          <Input id="ct-timezone" placeholder="e.g. Asia/Kolkata" {...register("timezone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ct-sortOrder">Sort Order</Label>
          <Input id="ct-sortOrder" type="number" placeholder="e.g. 0" {...register("sortOrder")} />
          {errors.sortOrder && (
            <p className="text-xs text-destructive">{errors.sortOrder.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

