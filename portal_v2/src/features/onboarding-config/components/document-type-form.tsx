import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DocumentTypeFormValues } from "../schema";

interface Props {
  mode: "create" | "edit";
  values: DocumentTypeFormValues;
  setValues: (values: DocumentTypeFormValues) => void;
  errors: Partial<Record<keyof DocumentTypeFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isPending: boolean;
}

const FLAG_FIELDS: { key: keyof DocumentTypeFormValues; label: string }[] = [
  { key: "requiresFront", label: "Requires front image" },
  { key: "requiresBack", label: "Requires back image" },
  { key: "requiresPdf", label: "Requires PDF" },
  { key: "requiresExpiry", label: "Requires expiry date" },
  { key: "requiresDocNumber", label: "Requires document number" },
];

export default function DocumentTypeForm({
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  onCancel,
  isPending,
}: Props) {
  const update = <K extends keyof DocumentTypeFormValues>(key: K, value: DocumentTypeFormValues[K]) =>
    setValues({ ...values, [key]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          value={values.code}
          onChange={(e) => update("code", e.target.value.toUpperCase())}
          placeholder="DRIVERS_LICENSE"
          disabled={mode === "edit"}
        />
        {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
      </div>

      <div className="space-y-2">
        {FLAG_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <input
              id={key}
              type="checkbox"
              checked={values[key] as boolean}
              onChange={(e) => update(key, e.target.checked as any)}
              className="h-4 w-4 rounded border-border cursor-pointer"
            />
            <Label htmlFor={key} className="cursor-pointer font-normal">
              {label}
            </Label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="maxFileSizeMb">Max File Size (MB)</Label>
          <Input
            id="maxFileSizeMb"
            type="number"
            min={1}
            value={values.maxFileSizeMb}
            onChange={(e) => update("maxFileSizeMb", Number(e.target.value) as any)}
          />
          {errors.maxFileSizeMb && <p className="text-xs text-destructive">{errors.maxFileSizeMb}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min={0}
            value={values.sortOrder}
            onChange={(e) => update("sortOrder", Number(e.target.value) as any)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {mode === "create" ? "Create Document Type" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
