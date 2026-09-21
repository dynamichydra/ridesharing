import { useMemo, useState } from "react";
import { BookText } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getLedgerTransactionColumns } from "../components/column";
import { LedgerEntriesDialog } from "../components/entries-dialog";
import { useLedgerTransactions } from "../hooks";
import type { LedgerTransaction, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  businessType: {
    label: "Business Type",
    operator: "equals",
    type: "text",
    field: "businessType",
    placeholder: "e.g. ride_fare_online, driver_payout",
  },
  referenceType: {
    label: "Reference Type",
    operator: "equals",
    type: "select",
    field: "referenceType",
    placeholder: "All Reference Types",
    options: [
      { label: "Ride", value: "ride" },
      { label: "Subscription", value: "subscription" },
      { label: "Rider Subscription", value: "rider_subscription" },
      { label: "Wallet Adjustment", value: "wallet_adjustment" },
      { label: "Payout", value: "payout" },
      { label: "Dispute", value: "dispute" },
      { label: "Refund", value: "refund" },
    ],
  },
  referenceId: {
    label: "Reference ID",
    operator: "equals",
    type: "text",
    field: "referenceId",
    placeholder: "Search by reference UUID",
  },
};

export default function LedgerList() {
  const controller = useFilterController();
  const [entriesTarget, setEntriesTarget] = useState<string | null>(null);
  const [isEntriesOpen, setIsEntriesOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useLedgerTransactions({
    businessType: controller.applied.businessType || undefined,
    referenceType: controller.applied.referenceType || undefined,
    referenceId: controller.applied.referenceId || undefined,
    page,
    limit,
  });

  const transactions = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? transactions.length;

  const handleViewEntries = (transaction: LedgerTransaction) => {
    setEntriesTarget(transaction.id);
    setIsEntriesOpen(true);
  };

  const columns = useMemo(() => getLedgerTransactionColumns({ onViewEntries: handleViewEntries }), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <BookText className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Ledger
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
          data={transactions}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <LedgerEntriesDialog open={isEntriesOpen} onOpenChange={setIsEntriesOpen} transactionId={entriesTarget} />
    </div>
  );
}
