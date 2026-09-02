import { useState } from "react";
import { Landmark, Pencil, BadgeCheck, BadgeX, ExternalLink, Globe, Copy, Check, Zap, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBankDetails, useUpsertBankDetails, useSetRiderBankVerified, useDriverPayoutSetup, useValidateDriverBank } from "../hooks";
import type { BankDetailsOwnerType, BankDetailsPayload } from "../types";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerType: BankDetailsOwnerType;
  ownerId: string;
}

// Write-only form — never pre-filled from a previous GET (the API never returns the raw
// account/wallet number, only a masked last-4 — see backend maskBankAccount()). Submitting
// blank optional fields alongside a new accountNumber/upiId/walletNumber is fine; the backend
// only requires one of the three destination fields to be present.
function EditBankDetailsDialog({ open, onOpenChange, ownerType, ownerId }: EditDialogProps) {
  const upsertMutation = useUpsertBankDetails(ownerType, ownerId);
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingCode, setRoutingCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [walletProvider, setWalletProvider] = useState("");
  const [walletNumber, setWalletNumber] = useState("");

  const reset = () => {
    setBankName(""); setAccountHolderName(""); setAccountNumber(""); setRoutingCode("");
    setUpiId(""); setWalletProvider(""); setWalletNumber("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim() && !upiId.trim() && !walletNumber.trim()) return;
    const payload: BankDetailsPayload = {
      bankName: bankName.trim() || undefined,
      accountHolderName: accountHolderName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      routingCode: routingCode.trim() || undefined,
      upiId: upiId.trim() || undefined,
      walletProvider: walletProvider.trim() || undefined,
      walletNumber: walletNumber.trim() || undefined,
    };
    upsertMutation.mutate(payload, { onSuccess: () => { onOpenChange(false); reset(); } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add / Edit Bank Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground">
            Provide at least one of: bank account (with routing code), UPI id, or wallet number.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bd-upi">UPI ID</Label>
            <Input id="bd-upi" placeholder="e.g. name@okhdfcbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bd-account-number">Account Number</Label>
              <Input id="bd-account-number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-routing-code">Routing Code (IFSC/SWIFT/Transit)</Label>
              <Input id="bd-routing-code" value={routingCode} onChange={(e) => setRoutingCode(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bd-bank-name">Bank Name</Label>
              <Input id="bd-bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-holder-name">Account Holder Name</Label>
              <Input id="bd-holder-name" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bd-wallet-provider">Wallet Provider</Label>
              <Input id="bd-wallet-provider" placeholder="e.g. M-Pesa" value={walletProvider} onChange={(e) => setWalletProvider(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bd-wallet-number">Wallet Number</Label>
              <Input id="bd-wallet-number" value={walletNumber} onChange={(e) => setWalletNumber(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending} className="cursor-pointer">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface BankDetailsPanelProps {
  ownerType: BankDetailsOwnerType;
  ownerId: string;
}

// Shared driver/rider bank-details card — admin add/edit on behalf of the owner. Drivers also
// have a self-service equivalent (PUT /driver/bank-details, no portal surface since there's no
// driver app yet); riders only ever get bank details through this admin panel — see
// features/bank-details/api.ts and backend bank-account.routes.js's adminBankAccountRoutes.
export function BankDetailsPanel({ ownerType, ownerId }: BankDetailsPanelProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { data, isLoading } = useBankDetails(ownerType, ownerId);
  const { data: setupData, isLoading: isSetupLoading } = useDriverPayoutSetup(ownerType === "driver" ? ownerId : undefined);
  const bankDetails = data?.MESSAGE ?? null;
  const payoutSetup = setupData?.MESSAGE ?? null;
  const setVerifiedMutation = useSetRiderBankVerified(ownerType === "rider" ? ownerId : undefined);
  const validateDriverBankMutation = useValidateDriverBank(ownerType === "driver" ? ownerId : undefined);

  const isStripeHosted = ownerType === "driver" && payoutSetup?.type === "hosted_redirect";

  const queryClient = useQueryClient();
  const [isSimulatingStripe, setIsSimulatingStripe] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Stripe Onboarding Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulateStripeApprove = async () => {
    try {
      setIsSimulatingStripe(true);
      await apiClient.get(`/payout-accounts/stripe/onboarding-return?driverId=${ownerId}&mock=true`);
      queryClient.invalidateQueries({ queryKey: ["driver-payout-setup", ownerId] });
      toast.success("Driver Stripe payout account verified & approved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to simulate Stripe approval");
    } finally {
      setIsSimulatingStripe(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm md:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-primary" /> {isStripeHosted ? "Payout Account (Stripe Connect)" : "Bank Details (Razorpay / Direct)"}
          </CardTitle>
          <CardDescription>
            {isStripeHosted
              ? "Stripe Express Connect is used for automated CAD / USD / EUR payouts in this driver's country."
              : ownerType === "driver"
              ? "RazorpayX payout destination — automated penny drop / UPI verification & fast disbursements."
              : "Bank/UPI details on file for this rider. Records only — no payout is triggered from here."}
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setIsEditOpen(true)} className="cursor-pointer shrink-0" variant={isStripeHosted ? "outline" : "default"}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> {bankDetails ? "Edit Direct Bank" : "Add Direct Bank"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || (ownerType === "driver" && isSetupLoading) ? (
          <p className="text-sm text-muted-foreground">Loading payout details…</p>
        ) : isStripeHosted ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">Stripe Connect ({payoutSetup.countryCode})</span>
              </div>
              <Badge variant={payoutSetup.isReady ? "default" : "outline"} className={payoutSetup.isReady ? "bg-green-600 text-white" : ""}>
                {payoutSetup.isReady ? "Payouts Active" : "Pending Onboarding"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-muted-foreground block">Gateway</span>
                <span className="font-medium text-foreground uppercase">{payoutSetup.gateway}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Account Status</span>
                <span className="font-medium text-foreground capitalize">{payoutSetup.status}</span>
              </div>
            </div>

            {payoutSetup.onboardingUrl && (
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a href={payoutSetup.onboardingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button size="sm" className="w-full gap-2 cursor-pointer">
                    <ExternalLink className="h-4 w-4" /> Open Stripe Express Onboarding Link
                  </Button>
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 cursor-pointer"
                  onClick={() => handleCopyLink(payoutSetup.onboardingUrl)}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Link"}
                </Button>
              </div>
            )}

            {!payoutSetup.isReady && (
              <div className="pt-1">
                {/* TODO: In production, Stripe accounts are verified automatically via Stripe Connect webhooks (account.updated) */}
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full gap-1.5 cursor-pointer text-xs"
                  disabled={isSimulatingStripe}
                  onClick={handleSimulateStripeApprove}
                >
                  {isSimulatingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                  Verify & Approve Payout Account
                </Button>
              </div>
            )}

            {bankDetails && (
              <div className="border-t border-border pt-3 mt-3">
                <span className="text-xs font-semibold text-muted-foreground block mb-1">Direct Bank Details (Optional Record):</span>
                <div className="text-xs text-muted-foreground flex gap-4">
                  <span>Bank: {bankDetails.bankName || "—"}</span>
                  <span>Account: •••• {bankDetails.accountNumberLast4 || "—"}</span>
                  <span>Routing: {bankDetails.routingCode || "—"}</span>
                </div>
              </div>
            )}
          </div>
        ) : !bankDetails ? (
          <p className="text-sm text-muted-foreground">No bank details on file yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {bankDetails.upiId && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">UPI ID</span>
                <span className="font-medium text-foreground">{bankDetails.upiId}</span>
              </div>
            )}
            {bankDetails.accountNumberLast4 && (
              <>
                <div>
                  <span className="text-xs text-muted-foreground block">Bank</span>
                  <span className="font-medium text-foreground">{bankDetails.bankName || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Account</span>
                  <span className="font-medium text-foreground">•••• {bankDetails.accountNumberLast4}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Holder Name</span>
                  <span className="font-medium text-foreground">{bankDetails.accountHolderName || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Routing Code</span>
                  <span className="font-medium text-foreground">{bankDetails.routingCode || "—"}</span>
                </div>
              </>
            )}
            {bankDetails.hasWalletNumber && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground block">Wallet</span>
                <span className="font-medium text-foreground">{bankDetails.walletProvider || "Wallet"} on file</span>
              </div>
            )}
            <div className="col-span-2 flex items-center justify-between border-t border-border pt-3">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  bankDetails.isVerified
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                {bankDetails.isVerified ? <BadgeCheck className="h-3.5 w-3.5" /> : <BadgeX className="h-3.5 w-3.5" />}
                {bankDetails.isVerified ? "Verified" : "Not verified"}
              </span>
              {ownerType === "rider" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer h-7"
                  disabled={setVerifiedMutation.isPending}
                  onClick={() => setVerifiedMutation.mutate(!bankDetails.isVerified)}
                >
                  Mark {bankDetails.isVerified ? "Unverified" : "Verified"}
                </Button>
              )}
              {ownerType === "driver" && !isStripeHosted && (
                <Button
                  size="sm"
                  variant="outline"
                  className="cursor-pointer h-7 text-xs gap-1.5"
                  disabled={validateDriverBankMutation.isPending}
                  onClick={() => validateDriverBankMutation.mutate()}
                >
                  {validateDriverBankMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-blue-600" />
                  )}
                  Verify via RazorpayX (Penny Drop)
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <EditBankDetailsDialog open={isEditOpen} onOpenChange={setIsEditOpen} ownerType={ownerType} ownerId={ownerId} />
    </Card>
  );
}
