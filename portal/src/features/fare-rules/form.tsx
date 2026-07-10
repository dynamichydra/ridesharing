import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import type { FareRuleFormValues } from "./schema";

interface FareRuleFormProps {
  values: FareRuleFormValues;
  setValues: (values: FareRuleFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
}

// Shared form body for both Create and Edit — dialog.tsx supplies the
// title/description/submit label that differ between the two flows.
export default function FareRuleForm({
  values,
  setValues,
  onSubmit,
  onCancel,
  submitLabel,
  isPending,
}: FareRuleFormProps) {
  const update = <K extends keyof FareRuleFormValues>(key: K, value: FareRuleFormValues[K]) => {
    setValues({ ...values, [key]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 py-3">
      <div className="space-y-2">
        <Label htmlFor="rule-name">
          Rule Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="rule-name"
          placeholder="e.g. Late Night Surge"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rule-type">
            Rule Type <span className="text-red-500">*</span>
          </Label>
          <select
            id="rule-type"
            value={values.ruleType}
            onChange={(e) => update("ruleType", e.target.value as FareRuleFormValues["ruleType"])}
            className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="time">Time-based</option>
            <option value="zone">Zone-based</option>
            <option value="traffic">Traffic-based</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-multiplier">
            Multiplier <span className="text-red-500">*</span>
          </Label>
          <Input
            id="rule-multiplier"
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 1.5"
            value={values.multiplier ?? ""}
            onChange={(e) => update("multiplier", Number(e.target.value))}
            required
          />
        </div>
      </div>

      {values.ruleType === "time" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rule-start-time">Start Time</Label>
            <Input
              id="rule-start-time"
              type="time"
              value={values.startTime || ""}
              onChange={(e) => update("startTime", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rule-end-time">End Time</Label>
            <Input
              id="rule-end-time"
              type="time"
              value={values.endTime || ""}
              onChange={(e) => update("endTime", e.target.value)}
            />
          </div>
        </div>
      )}

      {values.ruleType === "zone" && (
        <div className="space-y-2">
          <Label htmlFor="rule-zone-id">Zone ID</Label>
          <Input
            id="rule-zone-id"
            placeholder="Zone identifier"
            value={values.zoneId || ""}
            onChange={(e) => update("zoneId", e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="rule-description">Description</Label>
        <Textarea
          id="rule-description"
          placeholder="Optional internal note about when this rule applies"
          value={values.description || ""}
          onChange={(e) => update("description", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="rule-active"
          type="checkbox"
          checked={values.isActive ?? true}
          onChange={(e) => update("isActive", e.target.checked)}
          className="h-4 w-4 rounded border-border cursor-pointer"
        />
        <Label htmlFor="rule-active" className="cursor-pointer">
          Active
        </Label>
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
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}