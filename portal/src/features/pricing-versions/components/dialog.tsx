import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PricingVersionForm, { type PricingVersionLookups } from "./form";
import type { PricingVersionFormValues } from "../schema";

interface PricingVersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: PricingVersionFormValues;
  setValues: (values: PricingVersionFormValues) => void;
  errors: Partial<Record<keyof PricingVersionFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  lookups?: PricingVersionLookups;
}

export function PricingVersionFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  isPending,
  lookups,
}: PricingVersionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Pricing Version" : "Update Pricing Version"}</DialogTitle>
        </DialogHeader>
        <PricingVersionForm
          mode={mode}
          values={values}
          setValues={setValues}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={mode === "create" ? "Create Pricing Version" : "Save Changes"}
          isPending={isPending}
          lookups={lookups}
        />
      </DialogContent>
    </Dialog>
  );
}
