import { useState } from "react";
import toast from "react-hot-toast";
import { Search, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { getDriverColumns } from "./column";
import { DriverDocsDialog, ApproveDriverDialog, RejectDriverDialog } from "./dialog";
import {
  useDrivers,
  useApproveDriver,
  useRejectDriver,
  useToggleBlockDriver,
} from "./hooks";
import type { Driver } from "./types";

export default function DriverList() {
  // Filters
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<string>("");
  const [approvalStatusDraft, setApprovalStatusDraft] = useState<string>("");
  const [page, setPage] = useState(1);

  // Dialog / selection state
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");

  // Data + mutations
  const { data, isLoading } = useDrivers({
    page,
    limit: 10,
    approvalStatus: approvalStatus || undefined,
  });
  const approveMutation = useApproveDriver();
  const rejectMutation = useRejectDriver();
  const toggleBlockMutation = useToggleBlockDriver();

  const drivers = data?.MESSAGE || [];
  const pagination = data?.PAGINATION;

  const filteredDrivers = drivers.filter((d) => {
    if (!search) return true;
    const text = `${d.name || ""} ${d.phone || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const handleSearchSubmit = () => {
    setSearch(searchDraft);
    setApprovalStatus(approvalStatusDraft);
    setPage(1);
  };

  const handleSearchReset = () => {
    setSearchDraft("");
    setApprovalStatusDraft("");
    setSearch("");
    setApprovalStatus("");
    setPage(1);
  };

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

  const columns = getDriverColumns({
    onOpenDocs: handleOpenDocs,
    onToggleBlock: handleToggleBlock,
  });

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Loading drivers…</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-end gap-3 w-full">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter drivers by name/phone..."
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit();
            }}
            className="pl-9"
          />
        </div>
        <select
          value={approvalStatusDraft}
          onChange={(e) => setApprovalStatusDraft(e.target.value)}
          className="bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option value="">All Verification Status</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <div className="flex items-center shrink-0">
          <Button
            onClick={handleSearchSubmit}
            variant="outline"
            className="rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-medium">Search</span>
          </Button>
          <Button
            onClick={handleSearchReset}
            variant="outline"
            className="rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table — driven by column.tsx definitions */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left text-foreground">
          <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-4 font-semibold ${col.headerClassName ?? ""}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                  No drivers match your filters.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-4 ${col.cellClassName ?? ""}`}>
                      {col.render(driver)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-muted-foreground">
            Showing Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className="cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((prev) => prev + 1)}
              className="cursor-pointer"
            >
              Next <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <DriverDocsDialog
        open={isDocsOpen}
        onOpenChange={setIsDocsOpen}
        driver={selectedDriver}
        onApproveClick={() => setIsApproveOpen(true)}
        onRejectClick={() => setIsRejectOpen(true)}
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
    </div>
  );
}