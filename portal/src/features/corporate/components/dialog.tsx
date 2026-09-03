import { useState } from "react";
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
import { useCreateCorporateAccount, useAddCorporateUser } from "../hooks";

interface CreateCorporateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCorporateDialog({ open, onOpenChange }: CreateCorporateDialogProps) {
  const [name, setName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [businessReg, setBusinessReg] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditLimit, setCreditLimit] = useState("50000");

  const createMutation = useCreateCorporateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      name,
      billingEmail,
      billingPhone: billingPhone || undefined,
      businessRegistrationNumber: businessReg || undefined,
      taxId: taxId || undefined,
      creditLimitMinor: Math.round((parseFloat(creditLimit) || 0) * 100),
      currencyCode: "INR",
    });
    setName("");
    setBillingEmail("");
    setBillingPhone("");
    setBusinessReg("");
    setTaxId("");
    setCreditLimit("50000");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Corporate Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cname">Company / Organization Name</Label>
            <Input
              id="cname"
              required
              placeholder="e.g. Acme Corp Ltd"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bemail">Billing Email</Label>
              <Input
                id="bemail"
                type="email"
                required
                placeholder="billing@acme.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bphone">Billing Phone</Label>
              <Input
                id="bphone"
                placeholder="+91..."
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tax">Tax / GSTIN ID</Label>
              <Input
                id="tax"
                placeholder="27AAAPL..."
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="limit">Credit Line Limit (₹)</Label>
              <Input
                id="limit"
                type="number"
                step="1000"
                min="0"
                required
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>

            <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddCorporateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: import("../types").CorporateAccount | null;
}

export function AddCorporateUserDialog({
  open,
  onOpenChange,
  account,
}: AddCorporateUserDialogProps) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "employee">("employee");
  const [spendingLimit, setSpendingLimit] = useState("");

  const addUserMutation = useAddCorporateUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.id || !userId.trim()) return;

    await addUserMutation.mutateAsync({
      accountId: account.id,
      payload: {
        userId: userId.trim(),
        role,
        spendingLimitMinor: spendingLimit ? Math.round(parseFloat(spendingLimit) * 100) : null,
      },
    });

    setUserId("");
    setSpendingLimit("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Link Employee to {account?.name || "Account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="usr-id">User ID (UUID) *</Label>
            <Input
              id="usr-id"
              required
              placeholder="e.g. b11522dc-2cb4-4380-93dc-a381722db932"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usr-role">Role</Label>
            <select
              id="usr-role"
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Account Admin</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="usr-limit">Monthly Spending Limit (₹, optional)</Label>
            <Input
              id="usr-limit"
              type="number"
              placeholder="Leave blank for full account limit"
              value={spendingLimit}
              onChange={(e) => setSpendingLimit(e.target.value)}
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
            <Button type="submit" disabled={addUserMutation.isPending}>
              {addUserMutation.isPending ? "Linking..." : "Link Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
