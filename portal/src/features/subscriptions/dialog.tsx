import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubscriptionPlanForm } from "./form";
import type { SubscriptionPlanFormValues } from "./schema";
import type { SubscriptionPlan, VehicleTypeOption } from "./types";

const FORM_ID = "subscription-plan-form";

interface SubscriptionPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: SubscriptionPlan | null;
  defaultValues: SubscriptionPlanFormValues;
  vehicleTypes: VehicleTypeOption[];
  isSaving: boolean;
  onSubmit: (values: SubscriptionPlanFormValues) => void;
}

// All dialogs for the Subscriptions feature live here as separate named exports.
export function SubscriptionPlanFormDialog({
  open,
  onOpenChange,
  selectedPlan,
  defaultValues,
  vehicleTypes,
  isSaving,
  onSubmit,
}: SubscriptionPlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedPlan ? "Update Subscription Package" : "Create Onboarding Plan"}
          </DialogTitle>
        </DialogHeader>

        <SubscriptionPlanForm
          formId={FORM_ID}
          defaultValues={defaultValues}
          vehicleTypes={vehicleTypes}
          onSubmit={onSubmit}
        />

        <DialogFooter className="pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
            disabled={isSaving}
          >
            Save Onboarding Plan
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
          <span className="font-semibold text-foreground">{plan?.name}</span>? This will
          deactivate the plan for drivers.
        </p>
        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
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