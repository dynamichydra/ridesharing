import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDisputeColumns } from "../components/column";
import { DisputeNotesDialog } from "../components/notes-dialog";
import { useDisputes } from "../hooks";
import type { Dispute, DisputeListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  gateway: {
    label: "Gateway",
    operator: "equals",
    type: "select",
    field: "gateway",
    placeholder: "All Gateways",
    options: [
      { label: "Razorpay", value: "razorpay" },
      { label: "Stripe", value: "stripe" },
    ],
  },
  status: {
    label: "Status",
    operator: "equals",
    type: "text",
    field: "status",
    placeholder: "e.g. needs_response, won, lost",
  },
};

export default function DisputeList() {
  const controller = useFilterController();
  const [notesTarget, setNotesTarget] = useState<Dispute | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useDisputes({
    gateway: (controller.applied.gateway as DisputeListParams["gateway"]) || "",
    status: controller.applied.status || undefined,
    page,
    limit,
  });

  const disputes = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? disputes.length;

  const handleEditNotes = (dispute: Dispute) => {
    setNotesTarget(dispute);
    setIsNotesOpen(true);
  };

  const columns = useMemo(() => getDisputeColumns({ onEditNotes: handleEditNotes }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Disputes
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={disputes}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <DisputeNotesDialog open={isNotesOpen} onOpenChange={setIsNotesOpen} dispute={notesTarget} />
    </div>
  );
}
