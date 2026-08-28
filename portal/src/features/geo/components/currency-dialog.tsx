import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CurrencyForm } from "./currency-form";
import { currencySchema, emptyCurrencyFormValues, type CurrencyFormValues } from "../schema";
import { useCreateCurrency, useUpdateCurrency } from "../hooks";
import type { Currency } from "../types";

interface CurrencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currencyToEdit?: Currency | null;
}

export function CurrencyDialog({ open, onOpenChange, currencyToEdit }: CurrencyDialogProps) {
  const isEditing = Boolean(currencyToEdit);
  const createMutation = useCreateCurrency();
  const updateMutation = useUpdateCurrency();

  const form = useForm<CurrencyFormValues>({
    resolver: zodResolver(currencySchema),
    defaultValues: emptyCurrencyFormValues,
  });

  useEffect(() => {
    if (currencyToEdit) {
      form.reset({
        code: currencyToEdit.code || "",
        name: currencyToEdit.name || "",
        symbol: currencyToEdit.symbol || "",
        minorUnitExponent: String(currencyToEdit.minorUnitExponent ?? "2"),
      });
    } else {
      form.reset(emptyCurrencyFormValues);
    }
  }, [currencyToEdit, open, form]);

  const onSubmit = async (values: CurrencyFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      symbol: values.symbol,
      minorUnitExponent: parseInt(values.minorUnitExponent, 10) || 2,
    };

    if (currencyToEdit) {
      await updateMutation.mutateAsync({ id: currencyToEdit.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Currency" : "Add Global Currency"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <CurrencyForm form={form} isEditing={isEditing} />

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                ? "Update Currency"
                : "Create Currency"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
