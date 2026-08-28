import { useMemo } from "react";
import { Banknote } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getCashCollectionColumns } from "../components/column";
import { useCashCollections } from "../hooks";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Reported / Settled", value: "reported" },
      { label: "Mismatch", value: "mismatch" },
      { label: "Disputed", value: "disputed" },
    ],
  },
  driverId: {
    label: "Driver ID",
    operator: "equals",
    type: "text",
    field: "driverId",
    placeholder: "Filter by Driver ID",
  },
};

export default function CashManagementList() {
  const controller = useFilterController();

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useCashCollections({
    status: (controller.applied.status as string) || "",
    driverId: (controller.applied.driverId as string) || "",
    page,
    limit,
  });

  const collections = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? collections.length;

  const columns = useMemo(() => getCashCollectionColumns(), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Cash Collections & Settlements
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Collections
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
          data={collections}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
