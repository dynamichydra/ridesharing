import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import type { RiderFormValues } from "../schema";

interface RiderFormProps {
  form: UseFormReturn<RiderFormValues>;
}

export function RiderForm({ form }: RiderFormProps) {
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const countryId = watch("countryId");
  const stateId = watch("stateId");

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(countryId || undefined);
  const { data: citiesData } = useCityOptions(stateId || undefined);
  const countries = countriesData?.MESSAGE ?? [];
  const states = statesData?.MESSAGE ?? [];
  const cities = citiesData?.MESSAGE ?? [];

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="e.g. John Doe" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" placeholder="e.g. +919876543210" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address (Optional)</Label>
        <Input id="email" type="email" placeholder="e.g. john@example.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="r-countryId">Country (Optional)</Label>
          <Controller
            name="countryId"
            control={form.control}
            render={({ field }) => (
              <NativeSelect
                id="r-countryId"
                value={field.value || ""}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue("stateId", "");
                  setValue("cityId", "");
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-stateId">State</Label>
          <Controller
            name="stateId"
            control={form.control}
            render={({ field }) => (
              <NativeSelect
                id="r-stateId"
                value={field.value || ""}
                disabled={!states.length}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  setValue("cityId", "");
                }}
              >
                <NativeSelectOption value="">
                  {states.length ? "Select state" : "Select a country first"}
                </NativeSelectOption>
                {states.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="r-cityId">City</Label>
          <NativeSelect id="r-cityId" disabled={!cities.length} {...register("cityId")}>
            <NativeSelectOption value="">
              {cities.length ? "Select city" : "Select a state first"}
            </NativeSelectOption>
            {cities.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      <Controller
        name="isVerified"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2 pt-2">
            <input
              id="isVerified"
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 accent-primary rounded border-border"
            />
            <Label htmlFor="isVerified" className="cursor-pointer">
              Pre-verify user phone number
            </Label>
          </div>
        )}
      />
    </div>
  );
}