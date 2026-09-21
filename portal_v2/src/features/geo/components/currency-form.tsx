import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CurrencyFormValues } from "../schema";

interface CurrencyFormProps {
  form: UseFormReturn<CurrencyFormValues>;
  isEditing?: boolean;
}

export function CurrencyForm({ form, isEditing }: CurrencyFormProps) {
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cur-code">ISO Currency Code</Label>
          <Input
            id="cur-code"
            placeholder="e.g. USD, INR, EUR"
            maxLength={3}
            disabled={isEditing}
            {...register("code")}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cur-symbol">Symbol</Label>
          <Input id="cur-symbol" placeholder="e.g. ₹, $, €, CA$" {...register("symbol")} />
          {errors.symbol && <p className="text-xs text-destructive">{errors.symbol.message}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cur-name">Currency Name</Label>
        <Input id="cur-name" placeholder="e.g. United States Dollar" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cur-exp">Minor Unit Exponent (Decimal places)</Label>
        <NativeSelect id="cur-exp" {...register("minorUnitExponent")}>
          <NativeSelectOption value="2">2 decimals (cents / paise - Standard e.g. USD, INR, EUR)</NativeSelectOption>
          <NativeSelectOption value="0">0 decimals (integer units e.g. JPY, KRW)</NativeSelectOption>
          <NativeSelectOption value="3">3 decimals (milliunits e.g. BHD, KWD)</NativeSelectOption>
          <NativeSelectOption value="1">1 decimal</NativeSelectOption>
        </NativeSelect>
        {errors.minorUnitExponent && (
          <p className="text-xs text-destructive">{errors.minorUnitExponent.message}</p>
        )}
      </div>
    </div>
  );
}
