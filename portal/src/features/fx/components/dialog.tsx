import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useCreateFxRate } from "../hooks";

const POPULAR_CURRENCIES = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "INR", name: "Indian Rupee (₹)" },
  { code: "CAD", name: "Canadian Dollar (CA$)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "AED", name: "UAE Dirham (د.إ)" },
  { code: "SGD", name: "Singapore Dollar (S$)" },
  { code: "AUD", name: "Australian Dollar (A$)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
];

interface FxRateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FxRateDialog({ open, onOpenChange }: FxRateDialogProps) {
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [quoteCurrency, setQuoteCurrency] = useState("INR");
  const [rate, setRate] = useState("");
  const [provider, setProvider] = useState("Admin Portal");

  const createMutation = useCreateFxRate();

  const numRate = parseFloat(rate);
  const isValidRate = !isNaN(numRate) && numRate > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseCurrency || !quoteCurrency || !isValidRate) return;

    createMutation.mutate(
      {
        baseCurrency,
        quoteCurrency,
        rate: numRate,
        provider,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRate("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Currency Exchange Rate</DialogTitle>
            <DialogDescription>
              Add or update the authoritative exchange rate between two operational currencies.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="baseCurrency">Base Currency</Label>
                <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                  <SelectTrigger id="baseCurrency">
                    <SelectValue placeholder="Base Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteCurrency">Quote Currency</Label>
                <Select value={quoteCurrency} onValueChange={setQuoteCurrency}>
                  <SelectTrigger id="quoteCurrency">
                    <SelectValue placeholder="Quote Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rate">
                Exchange Rate (1 {baseCurrency} = ? {quoteCurrency})
              </Label>
              <Input
                id="rate"
                type="number"
                step="any"
                min="0.000001"
                placeholder="e.g. 84.2500"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Source / Reference Provider</Label>
              <Input
                id="provider"
                type="text"
                placeholder="e.g. Admin Portal, Central Bank, Bloomberg"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>

            {isValidRate && baseCurrency !== quoteCurrency && (
              <div className="p-3 bg-muted/60 rounded-lg border border-border space-y-1">
                <p className="text-xs font-medium text-foreground">Mathematical Preview:</p>
                <p className="text-xs text-muted-foreground font-mono">
                  • 1 {baseCurrency} = <span className="font-semibold text-primary">{numRate.toFixed(4)}</span> {quoteCurrency}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  • 1 {quoteCurrency} = <span className="font-semibold text-primary">{(1 / numRate).toFixed(6)}</span> {baseCurrency}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !isValidRate || baseCurrency === quoteCurrency}
            >
              {createMutation.isPending ? "Saving..." : "Save Exchange Rate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
