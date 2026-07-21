import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { DataTable } from "@/components/data-table/data-table";
import { useCallback, useMemo, useState } from "react";
import type { RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { RiderFormDialog } from "../components/dialog";

import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { useGeoFilterSchema } from "@/features/geo/hooks";

import { getRiderColumns } from "../components/column";
import { useRiders, useUpdateRider, useExportRiders } from "../hooks";
import type { Rider } from "../types";
import { Ban, Download, Plus, User, UserCheck } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

const BASE_FILTER_SCHEMA: FilterSchema = {
  search: {
    label: "Search",
    operator: "equals",
    type: "text",
    field: "search",
    placeholder: "Search by name, email or phone...",
  },
  isVerified: {
    label: "Verified",
    operator: "equals",
    type: "select",
    field: "isVerified",
    placeholder: "All Verification",
    options: [
      { label: "Verified", value: "true" },
      { label: "Unverified", value: "false" },
    ],
  },
  isBlocked: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "isBlocked",
    placeholder: "All Status",
    options: [
      { label: "Blocked", value: "true" },
      { label: "Active", value: "false" },
    ],
  },
};

function toBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export default function UserList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const controller = useFilterController();
  const geoFilterSchema = useGeoFilterSchema(controller);
  const FILTER_SCHEMA: FilterSchema = { ...BASE_FILTER_SCHEMA, ...geoFilterSchema };
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const { data, isLoading, isFetching } = useRiders({
    search: controller.applied.search,
    isVerified: toBool(controller.applied.isVerified),
    isBlocked: toBool(controller.applied.isBlocked),
    countryId: controller.applied.countryId,
    stateId: controller.applied.stateId,
    cityId: controller.applied.cityId,
    limit: Number(controller.applied.limit) || 10,
    page: Number(controller.applied.page) || 1,
  });
  const updateMutation = useUpdateRider();
  const exportMutation = useExportRiders();

  const riders = data?.MESSAGE ?? [];
  const selectedRiders = riders.filter((r) => rowSelection[r.id]);

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["riders"],
      refetchType: "active",
    });
  }, [queryClient]);
  const handleOpenCreate = () => {
    setIsCreateOpen(true);
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: controller.applied.search,
        isVerified: toBool(controller.applied.isVerified),
        isBlocked: toBool(controller.applied.isBlocked),
      },
      {
        onSuccess: (res) => {
          downloadCsv(`riders-${Date.now()}.csv`, res.MESSAGE ?? [], [
            { header: "ID", accessor: (r: Rider) => r.id },
            { header: "Name", accessor: (r: Rider) => r.name },
            { header: "Phone", accessor: (r: Rider) => r.phone },
            { header: "Email", accessor: (r: Rider) => r.email },
            { header: "Verified", accessor: (r: Rider) => r.isVerified },
            { header: "Blocked", accessor: (r: Rider) => r.isBlocked },
            { header: "Rating", accessor: (r: Rider) => r.rating },
            { header: "Total Rides", accessor: (r: Rider) => r.totalRides },
            { header: "Created At", accessor: (r: Rider) => r.createdAt },
          ]);
        },
      },
    );
  };

  const handleToggleVerify = useCallback(
    (rider: Rider) => {
      updateMutation.mutate(
        { id: rider.id, payload: { isVerified: !rider.isVerified } },
        { onSuccess: refreshList },
      );
    },
    [updateMutation, refreshList],
  );

  const handleToggleBlock = useCallback(
    (rider: Rider) => {
      updateMutation.mutate(
        { id: rider.id, payload: { isBlocked: !rider.isBlocked } },
        { onSuccess: refreshList },
      );
    },
    [updateMutation, refreshList],
  );

  const handleViewDetail = useCallback(
    (rider: Rider) => navigate(`/users/${rider.id}`),
    [navigate],
  );

  const handleBulkAction = async (action: "block" | "unblock") => {
    const targets = selectedRiders.filter((r) => (action === "block" ? !r.isBlocked : r.isBlocked));
    const results = await Promise.allSettled(
      targets.map((r) =>
        updateMutation.mutateAsync({ id: r.id, payload: { isBlocked: action === "block" } }),
      ),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;
    if (succeeded) {
      toast.success(`${action === "block" ? "Blocked" : "Unblocked"} ${succeeded} rider${succeeded === 1 ? "" : "s"}`);
    }
    if (failed) toast.error(`Failed to update ${failed} rider${failed === 1 ? "" : "s"}`);
    setRowSelection({});
    refreshList();
  };

  const columns = useMemo(
    () =>
      getRiderColumns({
        onViewDetail: handleViewDetail,
        onToggleVerify: handleToggleVerify,
        onToggleBlock: handleToggleBlock,
      }),
    [handleViewDetail, handleToggleVerify, handleToggleBlock],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="w-full flex-col p-3 md:p-6 flex gap-4">
      {/* Ultra Compact Header */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <User className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Rider
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {data?.COUNT ?? 0} Total
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exportMutation.isPending}
            className="gap-2 h-8"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            onClick={() => handleOpenCreate()}
            size="sm"
            className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
          >
            <Plus className="h-4 w-4" /> Create Rider
          </Button>
        </div>
      </div>

      {/* Tighter Filter Section */}
      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {selectedRiders.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm text-foreground">
            {selectedRiders.length} rider{selectedRiders.length === 1 ? "" : "s"} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("unblock")}
              disabled={updateMutation.isPending}
              className="gap-2 cursor-pointer"
            >
              <UserCheck className="h-4 w-4" /> Unblock Selected
            </Button>
            <Button
              size="sm"
              onClick={() => handleBulkAction("block")}
              disabled={updateMutation.isPending}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
            >
              <Ban className="h-4 w-4" /> Block Selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={riders}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={(Number(controller.applied.page) || 1) - 1}
        pageSize={Number(controller.applied.limit) || 10}
        onPageChange={handlePageChange}
        onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
      />

      <RiderFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        rider={null}
        onSuccess={refreshList}
      />
    </div>
  );
}
