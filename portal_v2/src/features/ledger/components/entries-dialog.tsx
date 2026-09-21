import { BookText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLedgerTransaction } from "../hooks";
import { formatDateTime } from "@/lib/utils";

function formatMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string | null;
}

export function LedgerEntriesDialog({ open, onOpenChange, transactionId }: Props) {
  const { data, isLoading } = useLedgerTransaction(transactionId ?? undefined);
  const detail = data?.MESSAGE;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookText className="h-4 w-4 text-primary" /> Ledger Entries
          </DialogTitle>
          <DialogDescription>
            Every entry in this transaction — debits and credits always sum to zero per currency.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading entries…</p>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Transaction not found.</p>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground capitalize">
                {detail.transaction.businessType.replace(/_/g, " ")}
              </span>
              {" · "}
              {formatDateTime(detail.transaction.createdAt)}
            </div>
            {detail.entries.map((entry) => (
              <div
                key={entry.id}
                className="border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <div className="font-semibold text-foreground text-xs">
                    {entry.accountType === "wallet" ? `Wallet ${entry.walletId?.slice(0, 8)}...` : entry.accountCode}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{entry.accountType} account</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{formatMinor(entry.amountMinor, entry.currencyCode)}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      entry.direction === "debit"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                    }`}
                  >
                    {entry.direction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
