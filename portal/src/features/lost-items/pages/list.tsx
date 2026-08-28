import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getLostItemColumns } from "../components/column";
import { LostItemStatusDialog } from "../components/dialog";
import { useLostItems } from "../hooks";
import type { LostItem } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Open", value: "open" },
      { label: "Driver Contacted", value: "driver_contacted" },
      { label: "Item Found", value: "item_found" },
      { label: "Returning", value: "returning" },
      { label: "Returned", value: "returned" },
      { label: "Closed", value: "closed" },
    ],
  },
  rideId: {
    label: "Ride ID",
    operator: "equals",
    type: "text",
    field: "rideId",
    placeholder: "Filter by Ride ID",
  },
};

export default function LostItemList() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useLostItems({
    status: (controller.applied.status as string) || "",
    rideId: (controller.applied.rideId as string) || "",
    page,
    limit,
  });

  const items = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? items.length;

  const handleEditStatus = (item: LostItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const columns = useMemo(() => getLostItemColumns({ onEditStatus: handleEditStatus }), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <PackageSearch className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Lost & Found Claims
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Claims
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
          data={items}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <LostItemStatusDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedItem(null);
        }}
        item={selectedItem}
      />
    </div>
  );
}
