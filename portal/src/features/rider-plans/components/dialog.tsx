import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RiderPlanForm } from "./form";
import type { RiderPlanFormValues } from "../schema";
import type { RiderPlan, LookupOption } from "../types";

const FORM_ID = "rider-plan-form";

interface RiderPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPlan: RiderPlan | null;
  defaultValues: RiderPlanFormValues;
  countries: LookupOption[];
  isSaving: boolean;
  onSubmit: (values: RiderPlanFormValues) => void;
}

export function RiderPlanFormDialog({
  open,
  onOpenChange,
  selectedPlan,
  defaultValues,
  countries,
  isSaving,
  onSubmit,
}: RiderPlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedPlan ? "Edit Rider Plan" : "Create Rider Plan"}</DialogTitle>
        </DialogHeader>

        <RiderPlanForm
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
