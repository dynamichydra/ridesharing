import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDriverColumns } from "../components/column";
import {
  DriverDocsDialog,
  ApproveDriverDialog,
  RejectDriverDialog,
  RequestDocumentsDialog,
} from "../components/dialog";
import { DriverFilters } from "../components/filters";
import {
  useDrivers,
  useApproveDriver,
  useRejectDriver,
  useRequestDriverDocuments,
  useToggleBlockDriver,
} from "../hooks";
import type { Driver, Pagination } from "../types";

export default function DriverList() {
  const controller = useFilterController();

  const [search, setSearch] = useState("");

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isRequestDocsOpen, setIsRequestDocsOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");
  const [requestDocCodes, setRequestDocCodes] = useState("");
  const [requestDocNote, setRequestDocNote] = useState("");

  const page = Number(controller.applied.page) || 1;

  const { data, isLoading, isFetching } = useDrivers({
    page,
    limit: 10,
    approvalStatus: controller.applied.approvalStatus || undefined,
  });
  const approveMutation = useApproveDriver();
  const rejectMutation = useRejectDriver();
  const requestDocsMutation = useRequestDriverDocuments();
  const toggleBlockMutation = useToggleBlockDriver();

  const drivers = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? drivers.length;

  const filteredDrivers = drivers.filter((d) => {
    if (!search) return true;
    const text = `${d.name || ""} ${d.phone || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleOpenDocs = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDocsOpen(true);
  };

  const handleToggleBlock = (driver: Driver) => {
    toggleBlockMutation.mutate({ id: driver.id, isBlocked: driver.isBlocked });
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    approveMutation.mutate(
      { id: selectedDriver.id, note: approvalNote },
      {
        onSuccess: () => {
          setIsApproveOpen(false);
          setIsDocsOpen(false);
          setApprovalNote("");
        },
      }
    );
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    if (!rejectionNote.trim()) {
      toast.error("Rejection note is required");
      return;
    }
    rejectMutation.mutate(
      { id: selectedDriver.id, note: rejectionNote },
      {
        onSuccess: () => {
          setIsRejectOpen(false);
          setIsDocsOpen(false);
          setRejectionNote("");
        },
      }
    );
  };

  const handleRequestDocsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    const documentTypeCodes = requestDocCodes
      .split(",")
      .map((code) => code.trim())
      .filter(Boolean);
    if (documentTypeCodes.length === 0) {
      toast.error("Enter at least one document type code");
      return;
    }
    requestDocsMutation.mutate(
      { id: selectedDriver.id, documentTypeCodes, note: requestDocNote || undefined },
      {
        onSuccess: () => {
          setIsRequestDocsOpen(false);
          setIsDocsOpen(false);
          setRequestDocCodes("");
          setRequestDocNote("");
        },
      }
    );
  };

  const columns = useMemo(
    () =>
      getDriverColumns({
        onOpenDocs: handleOpenDocs,
        onToggleBlock: handleToggleBlock,
      }),
    []
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading drivers…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3 w-full">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter drivers by name/phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <DriverFilters controller={controller} isFetching={isFetching} />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredDrivers}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>

      <DriverDocsDialog
        open={isDocsOpen}
        onOpenChange={setIsDocsOpen}
        driver={selectedDriver}
        onApproveClick={() => setIsApproveOpen(true)}
        onRejectClick={() => setIsRejectOpen(true)}
        onRequestDocumentsClick={() => setIsRequestDocsOpen(true)}
      />
      <ApproveDriverDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        note={approvalNote}
        setNote={setApprovalNote}
        onSubmit={handleApproveSubmit}
        isPending={approveMutation.isPending}
      />
      <RejectDriverDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        note={rejectionNote}
        setNote={setRejectionNote}
        onSubmit={handleRejectSubmit}
        isPending={rejectMutation.isPending}
      />
      <RequestDocumentsDialog
        open={isRequestDocsOpen}
        onOpenChange={setIsRequestDocsOpen}
        documentTypeCodes={requestDocCodes}
        setDocumentTypeCodes={setRequestDocCodes}
        note={requestDocNote}
        setNote={setRequestDocNote}
        onSubmit={handleRequestDocsSubmit}
        isPending={requestDocsMutation.isPending}
      />
    </div>
  );
}
