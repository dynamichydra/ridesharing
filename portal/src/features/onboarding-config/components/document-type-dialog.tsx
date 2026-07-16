import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import DocumentTypeForm from "./document-type-form";
import type { DocumentTypeFormValues } from "../schema";
import type { DocumentType, DocumentTypeRequirement, LookupOption } from "../types";

interface DocumentTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  values: DocumentTypeFormValues;
  setValues: (values: DocumentTypeFormValues) => void;
  errors: Partial<Record<keyof DocumentTypeFormValues, string>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function DocumentTypeFormDialog({
  open,
  onOpenChange,
  mode,
  values,
  setValues,
  errors,
  onSubmit,
  isPending,
}: DocumentTypeFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Document Type" : "Edit Document Type"}</DialogTitle>
        </DialogHeader>
        <DocumentTypeForm
          mode={mode}
          values={values}
          setValues={setValues}
          errors={errors}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

interface RequirementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType | null;
  requirements: DocumentTypeRequirement[];
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  isLoading: boolean;
  onAdd: (countryId: string, vehicleTypeId: string, isRequired: boolean) => void;
  onRemove: (requirementId: string) => void;
  isAdding: boolean;
}

function nameFromId(options: LookupOption[], id: string | null): string {
  if (!id) return "All";
  return options.find((o) => o.id === id)?.name || id;
}

export function RequirementsDialog({
  open,
  onOpenChange,
  documentType,
  requirements,
  countries,
  vehicleTypes,
  isLoading,
  onAdd,
  onRemove,
  isAdding,
}: RequirementsDialogProps) {
  const [countryId, setCountryId] = useState("__all__");
  const [vehicleTypeId, setVehicleTypeId] = useState("__all__");
  const [isRequired, setIsRequired] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Requirements — {documentType?.code}</DialogTitle>
          <DialogDescription>
            Scope where this document is required. Leave a scope as "All" to apply broadly — e.g. a
            country with no vehicle type applies to every vehicle type in that country.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="border border-border rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Countries</SelectItem>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={vehicleTypeId} onValueChange={setVehicleTypeId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Vehicle Types</SelectItem>
                  {vehicleTypes.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                />
                Required (uncheck for "optional in this scope")
              </label>
              <Button
                type="button"
                size="sm"
                disabled={isAdding}
                onClick={() => onAdd(countryId, vehicleTypeId, isRequired)}
                className="cursor-pointer"
              >
                Add Rule
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-4 text-xs text-muted-foreground">Loading rules...</div>
            ) : requirements.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground">
                No scoping rules — this document type has no country/vehicle-type-specific requirement.
              </div>
            ) : (
              requirements.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border border-border rounded-md px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {nameFromId(countries, r.countryId)}
                    </span>
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-medium text-foreground">
                      {nameFromId(vehicleTypes, r.vehicleTypeId)}
                    </span>
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        r.isRequired
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                      }`}
                    >
                      {r.isRequired ? "Required" : "Optional"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(r.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                    title="Remove rule"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
