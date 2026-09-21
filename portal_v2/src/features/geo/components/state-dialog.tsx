import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { stateSchema, emptyStateFormValues, type StateFormValues } from "../schema";
import { StateForm } from "./state-form";
import { useCreateState, useUpdateState } from "../hooks";
import type { Country, State } from "../types";

interface StateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: State | null;
  countries: Country[];
  defaultCountryId?: string;
}

export function StateFormDialog({
  open,
  onOpenChange,
  state,
  countries,
  defaultCountryId,
}: StateFormDialogProps) {
  const createMutation = useCreateState();
  const updateMutation = useUpdateState();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<StateFormValues>({
    resolver: zodResolver(stateSchema),
    defaultValues: emptyStateFormValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      state
        ? { countryId: state.countryId, name: state.name, code: state.code || "" }
        : { ...emptyStateFormValues, countryId: defaultCountryId || "" },
    );
  }, [open, state, defaultCountryId, form]);

  const onSubmit = form.handleSubmit((values) => {
    const payload = { ...values, code: values.code || undefined };

    if (state) {
      updateMutation.mutate({ id: state.id, payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      createMutation.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{state ? "Edit State" : "Add State"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <StateForm form={form} countries={countries} />
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
              className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
              disabled={isPending}
            >
              {state ? "Save Changes" : "Create State"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
