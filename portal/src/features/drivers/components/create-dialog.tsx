import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useCountryOptions, useStateOptions, useCityOptions } from "@/features/geo/hooks";
import { useCreateDriver, useVehicleTypeOptions } from "../hooks";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = {
  name: "",
  phone: "",
  email: "",
  dateOfBirth: "",
  gender: "",
  preferredLanguageCode: "",
  countryId: "",
  stateId: "",
  cityId: "",
  vehicleTypeId: "",
  vehicleNumber: "",
  vehicleModel: "",
  vehicleYear: "",
};

export function CreateDriverDialog({ open, onOpenChange }: Props) {
  const createMutation = useCreateDriver();
  const [values, setValues] = useState(EMPTY);

  useEffect(() => {
    if (open) setValues(EMPTY);
  }, [open]);

  const { data: countriesData } = useCountryOptions();
  const { data: statesData } = useStateOptions(values.countryId || undefined);
  const { data: citiesData } = useCityOptions(values.stateId || undefined);
  const { data: vehicleTypesData } = useVehicleTypeOptions();

  const countries = countriesData?.MESSAGE || [];
  const states = statesData?.MESSAGE || [];
  const cities = citiesData?.MESSAGE || [];
  const vehicleTypes = vehicleTypesData?.MESSAGE || [];

  const set = (field: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      // Cascading resets — a state/city picked under the old country/state no longer applies.
      if (field === "countryId") { next.stateId = ""; next.cityId = ""; }
      if (field === "stateId") next.cityId = "";
      return next;
    });
  };

  const canSubmit = values.name.trim() && (values.phone.trim() || values.email.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate(
      {
        name: values.name.trim(),
        phone: values.phone.trim() || undefined,
        email: values.email.trim() || undefined,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender || undefined,
        preferredLanguageCode: values.preferredLanguageCode.trim() || undefined,
        countryId: values.countryId || undefined,
        stateId: values.stateId || undefined,
        cityId: values.cityId || undefined,
        vehicleTypeId: values.vehicleTypeId || undefined,
        vehicleNumber: values.vehicleNumber.trim() || undefined,
        vehicleModel: values.vehicleModel.trim() || undefined,
        vehicleYear: values.vehicleYear.trim() || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Register Driver
          </DialogTitle>
          <DialogDescription>
            Creates the driver record and starts them at the beginning of registration — they
            (or you, later) still need to complete documents and vehicle details before they can
            be approved.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cd-name">Full Name</Label>
              <Input id="cd-name" value={values.name} onChange={set("name")} placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-phone">Phone</Label>
              <Input id="cd-phone" value={values.phone} onChange={set("phone")} placeholder="+1..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-email">Email</Label>
              <Input id="cd-email" type="email" value={values.email} onChange={set("email")} placeholder="name@example.com" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Phone or email is required (at least one).</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cd-dob">Date of Birth</Label>
              <Input id="cd-dob" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-gender">Gender</Label>
              <NativeSelect id="cd-gender" value={values.gender} onChange={set("gender")}>
                <NativeSelectOption value="">Not specified</NativeSelectOption>
                <NativeSelectOption value="male">Male</NativeSelectOption>
                <NativeSelectOption value="female">Female</NativeSelectOption>
                <NativeSelectOption value="other">Other</NativeSelectOption>
                <NativeSelectOption value="prefer_not_to_say">Prefer not to say</NativeSelectOption>
              </NativeSelect>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cd-country">Country</Label>
              <NativeSelect id="cd-country" value={values.countryId} onChange={set("countryId")}>
                <NativeSelectOption value="">—</NativeSelectOption>
                {countries.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-state">State</Label>
              <NativeSelect id="cd-state" value={values.stateId} onChange={set("stateId")} disabled={!values.countryId}>
                <NativeSelectOption value="">—</NativeSelectOption>
                {states.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cd-city">City</Label>
              <NativeSelect id="cd-city" value={values.cityId} onChange={set("cityId")} disabled={!values.stateId}>
                <NativeSelectOption value="">—</NativeSelectOption>
                {cities.map((c) => (
                  <NativeSelectOption key={c.id} value={c.id}>
                    {c.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cd-lang">Preferred Language Code</Label>
            <Input id="cd-lang" value={values.preferredLanguageCode} onChange={set("preferredLanguageCode")} placeholder="e.g. en" />
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vehicle (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cd-vehicle-type">Vehicle Type</Label>
                <NativeSelect id="cd-vehicle-type" value={values.vehicleTypeId} onChange={set("vehicleTypeId")}>
                  <NativeSelectOption value="">—</NativeSelectOption>
                  {vehicleTypes.map((vt) => (
                    <NativeSelectOption key={vt.id} value={vt.id}>
                      {vt.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-vehicle-number">Vehicle Number</Label>
                <Input id="cd-vehicle-number" value={values.vehicleNumber} onChange={set("vehicleNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-vehicle-model">Vehicle Model</Label>
                <Input id="cd-vehicle-model" value={values.vehicleModel} onChange={set("vehicleModel")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cd-vehicle-year">Vehicle Year</Label>
                <Input id="cd-vehicle-year" value={values.vehicleYear} onChange={set("vehicleYear")} />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || createMutation.isPending} className="cursor-pointer">
              Register Driver
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
