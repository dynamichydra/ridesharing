import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface DriverActionFormProps {
  fieldId: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  submitClassName?: string;
  isPending: boolean;
}


export default function DriverActionForm({
  fieldId,
  label,
  required,
  placeholder,
  note,
  setNote,
  onSubmit,
  onCancel,
  submitLabel,
  submitClassName = "bg-green-600 hover:bg-green-700 text-white",
  isPending,
}: DriverActionFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor={fieldId}>
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          id={fieldId}
          placeholder={placeholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required={required}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          className={`${submitClassName} cursor-pointer`}
          disabled={isPending}
        >
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}