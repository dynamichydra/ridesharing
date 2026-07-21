import { useState } from "react";
import { Wallet as WalletIcon, Plus, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useDriverWallet, useRiderWallet, useWalletTransactions, useAdjustWallet } from "../hooks";
import type { WalletOwnerType, WalletTransactionType } from "../types";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

const TXN_STYLES: Record<WalletTransactionType, string> = {
  credit: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  debit: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface AdjustDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: WalletOwnerType;
  ownerId: string;
}

function AdjustWalletDialog({ open, onOpenChange, ownerType, ownerId }: AdjustDialogProps) {
  const adjustMutation = useAdjustWallet(ownerType, ownerId);
  const [type, setType] = useState<WalletTransactionType>("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setType("credit");
    setAmount("");
    setReason("");
    setDescription("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountMinor = Math.round(Number(amount) * 100);
    if (!amountMinor || amountMinor <= 0 || !reason.trim()) return;
    adjustMutation.mutate(
      { type, amountMinor, reason: reason.trim(), description: description.trim() || undefined },
      { onSuccess: () => { onOpenChange(false); reset(); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Adjust Wallet Balance</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wa-type">Type</Label>
            <NativeSelect id="wa-type" value={type} onChange={(e) => setType(e.target.value as WalletTransactionType)}>
              <NativeSelectOption value="credit">Credit (add funds)</NativeSelectOption>
              <NativeSelectOption value="debit">Debit (deduct funds)</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-amount">Amount</Label>
            <Input
              id="wa-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 100.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-reason">Reason</Label>
            <Input
              id="wa-reason"
              placeholder="e.g. bonus, penalty, refund"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-description">Description (Optional)</Label>
            <Textarea
              id="wa-description"
              placeholder="Internal note for this adjustment"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={adjustMutation.isPending} className="cursor-pointer">
              {type === "credit" ? "Credit Wallet" : "Debit Wallet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface WalletPanelProps {
  ownerType: WalletOwnerType;
  ownerId: string;
}

// Shared driver/rider wallet panel — balance summary + recent ledger + an Adjust Balance
// action. Drivers always resolve to a wallet (auto-created server-side); riders may have none.
export function WalletPanel({ ownerType, ownerId }: WalletPanelProps) {
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const driverWalletQuery = useDriverWallet(ownerType === "driver" ? ownerId : undefined);
  const riderWalletQuery = useRiderWallet(ownerType === "rider" ? ownerId : undefined);
  const { data: walletData, isLoading } = ownerType === "driver" ? driverWalletQuery : riderWalletQuery;
  const wallet = walletData?.MESSAGE ?? null;

  const { data: txnData, isLoading: txnLoading } = useWalletTransactions(wallet?.id);
  const transactions = txnData?.MESSAGE ?? [];

  return (
    <Card className="border-border bg-card shadow-sm md:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletIcon className="h-4 w-4 text-primary" /> Wallet
          </CardTitle>
          <CardDescription>
            {ownerType === "driver" ? "Balance and ledger for this driver." : "Optional balance and ledger for this rider."}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsAdjustOpen(true)} className="cursor-pointer shrink-0">
          <Plus className="h-3.5 w-3.5 mr-1" /> Adjust Balance
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading wallet…</p>
        ) : !wallet ? (
          <p className="text-sm text-muted-foreground">
            No wallet yet — crediting a balance will create one.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl font-bold text-foreground">
                {formatMinor(wallet.balanceMinor, wallet.currencyCode)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                  wallet.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {wallet.status}
              </span>
            </div>

            {txnLoading ? (
              <p className="text-sm text-muted-foreground">Loading transactions…</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-foreground capitalize">{txn.reason.replace(/_/g, " ")}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleString()}
                        {txn.description ? ` · ${txn.description}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        {txn.type === "credit" ? (
                          <Plus className="h-3 w-3 text-green-600" />
                        ) : (
                          <Minus className="h-3 w-3 text-red-600" />
                        )}
                        {formatMinor(txn.amountMinor, txn.currencyCode)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TXN_STYLES[txn.type]}`}>
                        {txn.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>

      <AdjustWalletDialog
        open={isAdjustOpen}
        onOpenChange={setIsAdjustOpen}
        ownerType={ownerType}
        ownerId={ownerId}
      />
    </Card>
  );
}
