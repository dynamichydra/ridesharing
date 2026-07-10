import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FareRuleForm from "./form";
import type { FareRuleFormValues } from "./schema";
import type { FareRule } from "./types";

/* ------------------------------------------------------------------ */
/* Create / Edit dialog — same form, different copy depending on mode  */
/* ------------------------------------------------------------------ */

interface FareRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: FareRuleFormValues;
  setValues: (values: FareRuleFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function FareRuleFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  setValues,
  onSubmit,
  isPending,
}: FareRuleFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Fare Rule" : "Edit Fare Rule"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Define a new surge/multiplier rule based on time, zone, or traffic conditions."
              : "Update the multiplier, conditions, or status for this fare rule."}
          </DialogDescription>
        </DialogHeader>
        <FareRuleForm
          values={values}
          setValues={setValues}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={mode === "create" ? "Create Rule" : "Save Changes"}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Delete confirmation dialog                                          */
/* ------------------------------------------------------------------ */

interface DeleteFareRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: FareRule | null;
  onConfirm: () => void;
  isPending: boolean;
}

export function DeleteFareRuleDialog({
  open,
  onOpenChange,
  rule,
  onConfirm,
  isPending,
}: DeleteFareRuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Delete Fare Rule</DialogTitle>
          <DialogDescription>
            This will permanently remove{" "}
            <span className="font-semibold text-foreground">{rule?.name}</span>. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
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
            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            disabled={isPending}
          >
            Delete Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}