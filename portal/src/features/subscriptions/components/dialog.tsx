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

interface SubscriptionPlanDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  isDeleting: boolean;
  onConfirm: () => void;
}

export function SubscriptionPlanDeleteDialog({
  open,
  onOpenChange,
  plan,
  isDeleting,
  onConfirm,
}: SubscriptionPlanDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Subscription Plan</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">{plan?.name}</span>? This is a soft
          delete — the plan is deactivated, not permanently removed.
        </p>
        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
          >
            Delete Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
