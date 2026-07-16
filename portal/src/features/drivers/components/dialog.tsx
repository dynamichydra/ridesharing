import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import DriverActionForm, { RequestDocumentsForm } from "./form";


//Approve confirmation dialog — wraps the shared form.tsx

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


//Reject confirmation dialog — wraps the shared form.tsx              

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

//Request Documents dialog — wraps the shared form.tsx 

interface RequestDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeCodes: string;
  setDocumentTypeCodes: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RequestDocumentsDialog({
  open,
  onOpenChange,
  documentTypeCodes,
  setDocumentTypeCodes,
  note,
  setNote,
  onSubmit,
  isPending,
}: RequestDocumentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Request More Documents</DialogTitle>
          <DialogDescription>
            Ask the driver to (re-)upload specific documents. This moves their status back to
            documents pending.
          </DialogDescription>
        </DialogHeader>
        <RequestDocumentsForm
          documentTypeCodes={documentTypeCodes}
          setDocumentTypeCodes={setDocumentTypeCodes}
          note={note}
          setNote={setNote}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

// Reject-one-document dialog — collects the rejectionReason a single doc verify call requires.

interface RejectDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function RejectDocumentDialog({
  open,
  onOpenChange,
  reason,
  setReason,
  onSubmit,
  isPending,
}: RejectDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
          <DialogDescription>
            Tell the driver what's wrong so they know what to re-upload.
          </DialogDescription>
        </DialogHeader>
        <DriverActionForm
          fieldId="reject-document-reason"
          label="Rejection Reason"
          required
          placeholder="e.g. Photo is blurry, license number unreadable."
          note={reason}
          setNote={setReason}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel="Reject Document"
          submitClassName="bg-red-600 hover:bg-red-700 text-white"
          isPending={isPending}
        />
      </DialogContent>
    </Dialog>
  );
}
