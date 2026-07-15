import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RiderFormValues } from "../schema";

interface RiderFormProps {
  form: UseFormReturn<RiderFormValues>;
}

export function RiderForm({ form }: RiderFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

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