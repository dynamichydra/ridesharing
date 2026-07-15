import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface RequestDocumentsFormProps {
  documentTypeCodes: string;
  setDocumentTypeCodes: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function RequestDocumentsForm({
  documentTypeCodes,
  setDocumentTypeCodes,
  note,
  setNote,
  onSubmit,
  onCancel,
  isPending,
}: RequestDocumentsFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor="request-doc-codes">
          Document Type Codes <span className="text-red-500">*</span>
        </Label>
        <Input
          id="request-doc-codes"
          placeholder="e.g. driving_license, aadhar_card"
          value={documentTypeCodes}
          onChange={(e) => setDocumentTypeCodes(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Comma-separated document type codes.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="request-doc-note">Note (Optional)</Label>
        <Textarea
          id="request-doc-note"
          placeholder="e.g. License photo is blurry, please re-upload."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
          disabled={isPending}
        >
          Send Request
        </Button>
      </DialogFooter>
    </form>
  );
}
