import { useMemo, useState } from "react";
import { Undo2, Plus } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Button } from "@/components/ui/button";

import { getRefundColumns } from "../components/column";
import { InitiateRefundDialog } from "../components/dialog";
import { useRefunds } from "../hooks";
import type { RefundListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  paymentId: {
    label: "Payment ID",
    operator: "equals",
    type: "text",
    field: "paymentId",
    placeholder: "Search by payment ID",
  },
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Completed", value: "completed" },
      { label: "Failed", value: "failed" },
    ],
  },
};

export default function RefundList() {
  const controller = useFilterController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useRefunds({
    paymentId: controller.applied.paymentId || undefined,
    status: (controller.applied.status as RefundListParams["status"]) || "",
    page,
    limit,
  });

  const refunds = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? refunds.length;

  const columns = useMemo(() => getRefundColumns(), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Undo2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Refunds
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
        </div>
        <Button size="sm" onClick={() => setIsCreateOpen(true)} className="cursor-pointer">
          <Plus className="h-3.5 w-3.5 mr-1" /> New Refund
        </Button>
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
          data={refunds}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <InitiateRefundDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
