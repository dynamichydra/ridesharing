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
import { riderSchema, emptyRiderFormValues, type RiderFormValues } from "../schema";
import { RiderForm } from "./form";
import { useCreateRider } from "../hooks";

interface CreateRiderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRiderDialog({ open, onOpenChange, onSuccess }: CreateRiderDialogProps) {
  const createMutation = useCreateRider();

  const form = useForm<RiderFormValues>({
    resolver: zodResolver(riderSchema),
    defaultValues: emptyRiderFormValues,
  });

  // Reset the form every time the dialog is opened fresh.
  useEffect(() => {
    if (open) {
      form.reset(emptyRiderFormValues);
    }
  }, [open, form]);

  const onSubmit = form.handleSubmit((values) => {
    createMutation.mutate(
      {
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        isVerified: values.isVerified,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onSuccess();
        },
      }
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <RiderForm form={form} />
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
              disabled={createMutation.isPending}
            >
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}