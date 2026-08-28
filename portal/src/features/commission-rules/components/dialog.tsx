import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCommissionRule, useUpdateCommissionRule } from "../hooks";
import type { CommissionRule } from "../types";

interface CommissionRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleToEdit?: CommissionRule | null;
}

export function CommissionRuleDialog({
  open,
  onOpenChange,
  ruleToEdit,
}: CommissionRuleDialogProps) {
  const [name, setName] = useState("");
  const [subscriberRate, setSubscriberRate] = useState("5");
  const [nonSubscriberRate, setNonSubscriberRate] = useState("20");
  const [flatCommission, setFlatCommission] = useState("0");
  const [description, setDescription] = useState("");

  const createMutation = useCreateCommissionRule();
  const updateMutation = useUpdateCommissionRule();

  useEffect(() => {
    if (ruleToEdit) {
      setName(ruleToEdit.name || "");
      setSubscriberRate(String(ruleToEdit.subscriberRate ?? "5"));
      setNonSubscriberRate(String(ruleToEdit.nonSubscriberRate ?? "20"));
      setFlatCommission(
        ruleToEdit.flatCommissionMinor != null
          ? String(ruleToEdit.flatCommissionMinor / 100)
          : "0",
      );
      setDescription(ruleToEdit.description || "");
    } else {
      setName("");
      setSubscriberRate("5");
      setNonSubscriberRate("20");
      setFlatCommission("0");
      setDescription("");
    }
  }, [ruleToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      subscriberRate: parseFloat(subscriberRate) || 0,
      nonSubscriberRate: parseFloat(nonSubscriberRate) || 0,
      flatCommissionMinor: Math.round((parseFloat(flatCommission) || 0) * 100),
      description: description || undefined,
    };

    if (ruleToEdit) {
      await updateMutation.mutateAsync({ id: ruleToEdit.id, payload });
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
          <DialogTitle>
            {ruleToEdit ? "Edit Commission Rule" : "Create Commission Rule"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              required
              placeholder="e.g. Standard Tier 1"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="subRate">Subscriber Rate (%)</Label>
              <Input
                id="subRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={subscriberRate}
                onChange={(e) => setSubscriberRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nonSubRate">Non-Subscriber Rate (%)</Label>
              <Input
                id="nonSubRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                required
                value={nonSubscriberRate}
                onChange={(e) => setNonSubscriberRate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flatFee">Flat Commission Fee (₹)</Label>
            <Input
              id="flatFee"
              type="number"
              step="0.5"
              min="0"
              value={flatCommission}
              onChange={(e) => setFlatCommission(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={2}
              placeholder="Optional notes about when this rule applies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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
                : ruleToEdit
                ? "Update Rule"
                : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
