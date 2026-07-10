import { FileText, Truck, User, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DriverActionForm from "./form";
import type { Driver } from "./types";

/* ------------------------------------------------------------------ */
/* Docs / Registration review dialog                                   */
/* ------------------------------------------------------------------ */

interface DriverDocsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: Driver | null;
  onApproveClick: () => void;
  onRejectClick: () => void;
}

export function DriverDocsDialog({
  open,
  onOpenChange,
  driver,
  onApproveClick,
  onRejectClick,
}: DriverDocsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partner Registration Review</DialogTitle>
          <DialogDescription>
            Verify drivers license, identity credentials, and vehicle documentation.
          </DialogDescription>
        </DialogHeader>

        {driver && (
          <div className="space-y-6 py-4">
            {/* Profile info */}
            <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {driver.profilePhoto ? (
                  <img
                    src={driver.profilePhoto}
                    alt="Profile"
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {driver.name || "Unnamed Driver"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {driver.phone} | {driver.email || "No Email"}
                </p>
              </div>
            </div>

            {/* Grid document info */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Identity Cards */}
              <div className="space-y-4 border border-border p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" /> Identity Credentials
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">Aadhar UID number</span>
                    <span className="text-sm font-medium">
                      {driver.aadharNumber || "Not provided"}
                    </span>
                  </div>
                  {driver.aadharDoc && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        Aadhar Document Proof
                      </span>
                      <a
                        href={driver.aadharDoc}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        View Uploaded Document Link
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver License */}
              <div className="space-y-4 border border-border p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" /> Driving License
                </h4>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-muted-foreground block">License Number</span>
                    <span className="text-sm font-medium">
                      {driver.licenseNumber || "Not provided"}
                    </span>
                  </div>
                  {driver.licenseDoc && (
                    <div>
                      <span className="text-xs text-muted-foreground block mb-1">
                        License Copy
                      </span>
                      <a
                        href={driver.licenseDoc}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs font-semibold hover:underline"
                      >
                        View License Copy Link
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle parameters */}
            <div className="border border-border p-4 rounded-lg space-y-4">
              <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                <Truck className="h-4 w-4" /> Vehicle Verification
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Vehicle Number</span>
                  <span className="font-medium">{driver.vehicleNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Make / Model</span>
                  <span className="font-medium">{driver.vehicleModel || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Year of Mfg</span>
                  <span className="font-medium">{driver.vehicleYear || "—"}</span>
                </div>
              </div>
              {driver.vehiclePhoto && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Vehicle Photo Reference
                  </span>
                  <a
                    href={driver.vehiclePhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    View Vehicle Photo Link
                  </a>
                </div>
              )}
            </div>

            {/* Approval status banner */}
            {driver.approvalStatus !== "pending" && (
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <strong>Onboarding Note:</strong> {driver.approvalNote || "No note recorded."}
              </div>
            )}

            {/* Decision Actions */}
            {driver.approvalStatus === "pending" && (
              <div className="flex gap-2 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={onRejectClick}
                  className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject Application
                </Button>
                <Button
                  onClick={onApproveClick}
                  className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve Partner
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Approve confirmation dialog — wraps the shared form.tsx             */
/* ------------------------------------------------------------------ */

interface ApproveDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function ApproveDriverDialog({
  open,
  onOpenChange,
  note,
  setNote,
  onSubmit,
  isPending,
}: ApproveDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Approve Partner Application</DialogTitle>
          <DialogDescription>
            Provide onboarding remarks or notes for driver's activation logs.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="approve-note"
          label="Onboarding Notes (Optional)"
          placeholder="e.g. All documents verified clean. Activated."
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Complete Approval"
          submitClassName="bg-green-600 hover:bg-green-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Reject confirmation dialog — wraps the shared form.tsx              */
/* ------------------------------------------------------------------ */

interface RejectDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RejectDriverDialog({
  open,
  onOpenChange,
  note,
  setNote,
  onSubmit,
  isPending,
}: RejectDriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reject Application</DialogTitle>
          <DialogDescription>
            A rejection note is required to specify reasons (e.g. Blurry driving license upload).
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="reject-note"
          label="Rejection Note"
          required
          placeholder="Specify rejection reason details..."
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Submit Rejection"
          submitClassName="bg-red-600 hover:bg-red-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}