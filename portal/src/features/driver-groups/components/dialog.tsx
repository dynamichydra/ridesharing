import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import type { DriverGroup, CreateDriverGroupPayload } from "../types";
import type { LookupOption } from "@/features/subscriptions/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: DriverGroup | null;
  countries: LookupOption[];
  onSubmit: (payload: CreateDriverGroupPayload) => void;
  isSubmitting?: boolean;
}

interface FormValues {
  name: string;
  code: string;
  description: string;
  countryId: string;
  isActive: boolean;
}

export function DriverGroupDialog({
  open,
  onOpenChange,
  group,
  countries,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const isEditing = Boolean(group);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      code: "",
      description: "",
      countryId: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (group) {
        reset({
          name: group.name,
          code: group.code,
          description: group.description || "",
          countryId: group.countryId || "",
          isActive: group.isActive,
        });
      } else {
        reset({
          name: "",
          code: "",
          description: "",
          countryId: "",
          isActive: true,
        });
      }
    }
  }, [open, group, reset]);

  const onFormSubmit = (data: FormValues) => {
    onSubmit({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description.trim() || null,
      countryId: data.countryId || null,
      isActive: data.isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Driver Group" : "Create Driver Group"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update driver cohort settings and targeting."
              : "Define a new driver cohort for special pricing, perks, and offers."}
          </DialogDescription>
        </DialogHeader>

        <form id="driver-group-form" onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">
              Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-name"
              placeholder="e.g. Airport Chauffeurs or EV Partners"
              {...register("name", { required: "Group name is required" })}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-code">
              Unique Code Identifier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="group-code"
              placeholder="e.g. AIRPORT_FLEET"
              disabled={isEditing}
              className="font-mono uppercase"
              {...register("code", { required: "Code is required" })}
            />
            {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-country">Country Scope</Label>
            <NativeSelect id="group-country" {...register("countryId")}>
              <option value="">Global (All Countries)</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              placeholder="Internal notes or eligibility criteria for this driver group…"
              rows={3}
              {...register("description")}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="group-active"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              {...register("isActive")}
            />
            <Label htmlFor="group-active" className="cursor-pointer font-normal text-sm">
              Active (Drivers in this group are eligible for active offers)
            </Label>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button form="driver-group-form" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
