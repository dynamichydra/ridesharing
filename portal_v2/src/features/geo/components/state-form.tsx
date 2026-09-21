import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { StateFormValues } from "../schema";
import type { Country } from "../types";

interface StateFormProps {
  form: UseFormReturn<StateFormValues>;
  countries: Country[];
  disableCountry?: boolean;
}

export function StateForm({ form, countries, disableCountry }: StateFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="s-countryId">Country</Label>
        <NativeSelect id="s-countryId" disabled={disableCountry} {...register("countryId")}>
          <NativeSelectOption value="">Select country</NativeSelectOption>
          {countries.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {errors.countryId && (
          <p className="text-xs text-destructive">{errors.countryId.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="s-name">State Name</Label>
        <Input id="s-name" placeholder="e.g. Karnataka" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="s-code">State Code (Optional)</Label>
        <Input id="s-code" placeholder="e.g. KA" {...register("code")} />
      </div>
    </div>
  );
}
