import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEGAL_TYPE_OPTIONS, type LegalDocumentFormValues } from "../schema";
import type { LookupOption } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: LegalDocumentFormValues;
  setValues: (values: LegalDocumentFormValues) => void;
  errors: Partial<Record<keyof LegalDocumentFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  countries: LookupOption[];
}

export function LegalDocumentFormDialog({
  open,
  onOpenChange,
  values,
  setValues,
  errors,
  onSubmit,
  isPending,
  countries,
}: Props) {
  const update = <K extends keyof LegalDocumentFormValues>(key: K, value: LegalDocumentFormValues[K]) =>
    setValues({ ...values, [key]: value });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Publish Legal Document Version</DialogTitle>
          <DialogDescription>
            Publishing creates a new version drivers must accept — there's no edit, only new
            versions (an audit-safe history of what drivers agreed to).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={values.type} onValueChange={(v) => update("type", v as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEGAL_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={values.version}
                onChange={(e) => update("version", e.target.value)}
                placeholder="2026-01"
              />
              {errors.version && <p className="text-xs text-destructive">{errors.version}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Country Scope</Label>
            <Select
              value={values.countryId || "__global__"}
              onValueChange={(v) => update("countryId", v === "__global__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__global__">Global (default)</SelectItem>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contentUrl">Content URL</Label>
            <Input
              id="contentUrl"
              value={values.contentUrl}
              onChange={(e) => update("contentUrl", e.target.value)}
              placeholder="https://..."
            />
            {errors.contentUrl && <p className="text-xs text-destructive">{errors.contentUrl}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="effectiveFrom">Effective From</Label>
            <Input
              id="effectiveFrom"
              type="datetime-local"
              value={values.effectiveFrom}
              onChange={(e) => update("effectiveFrom", e.target.value)}
            />
            {errors.effectiveFrom && <p className="text-xs text-destructive">{errors.effectiveFrom}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
