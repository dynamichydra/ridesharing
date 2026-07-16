import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubscriptionPlanForm } from "./form";
import type { SubscriptionPlanFormValues } from "../schema";
import type { SubscriptionPlan, LookupOption } from "../types";

const FORM_ID = "subscription-plan-form";

interface SubscriptionPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SubscriptionPlan | null;
  defaultValues: SubscriptionPlanFormValues;
  countries: LookupOption[];
  isSaving: boolean;
  onSubmit: (values: SubscriptionPlanFormValues) => void;
}

export function SubscriptionPlanFormDialog({
  open,
  onOpenChange,
  selectedPlan,
  defaultValues,
  countries,
  isSaving,
  onSubmit,
}: SubscriptionPlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedPlan ? "Edit Subscription Plan" : "Create Subscription Plan"}
          </DialogTitle>
        </DialogHeader>

        <SubscriptionPlanForm
          formId={FORM_ID}
          defaultValues={defaultValues}
          countries={countries}
          onSubmit={onSubmit}
        />

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
            form={FORM_ID}
            className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
            disabled={isSaving}
          >
            Save Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

