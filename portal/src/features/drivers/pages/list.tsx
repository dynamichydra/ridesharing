import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Car, CheckCheck, Download, UserPlus } from "lucide-react";
import type { RowSelectionState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDriverColumns } from "../components/column";
import { CreateDriverDialog } from "../components/create-dialog";
import { EditDriverDialog } from "../components/dialog";
import { useDrivers, useToggleBlockDriver, useExportDrivers, useApproveDriver } from "../hooks";
import type { Driver } from "../types";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useGeoFilterSchema } from "@/features/geo/hooks";
import { downloadCsv } from "@/lib/csv";


export const driverBaseFilterSchema: FilterSchema = {
  approvalStatus: {
    label: "Verification Status",
    operator: "equals",
    type: "select",
    options: [
      { label: "Pending Review", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
};
export default function DriverList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const controller = useFilterController({
    limit: 10,
    page: 1,
  });
  const geoFilterSchema = useGeoFilterSchema(controller);
  const driverFilterSchema: FilterSchema = { ...driverBaseFilterSchema, ...geoFilterSchema };
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const page = Number(controller.applied.page) || 1;

  const { data, isLoading, isFetching } = useDrivers({
    page,
    limit: 10,
    approvalStatus: controller.applied.approvalStatus || undefined,
    countryId: controller.applied.countryId || undefined,
    stateId: controller.applied.stateId || undefined,
    cityId: controller.applied.cityId || undefined,
  });
  const toggleBlockMutation = useToggleBlockDriver();
  const exportMutation = useExportDrivers();
  const approveMutation = useApproveDriver();

  const drivers = data?.MESSAGE ?? [];
  const selectedDrivers = drivers.filter((d) => rowSelection[d.id]);
  const selectedPendingDrivers = selectedDrivers.filter((d) => d.approvalStatus === "pending");

  const handleViewDetail = (driver: Driver) => {
    navigate(`/drivers/${driver.id}`);
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
  };

  const handleExport = () => {
    exportMutation.mutate(
      { approvalStatus: controller.applied.approvalStatus || undefined },
      {
        onSuccess: (res) => {
          downloadCsv(`drivers-${Date.now()}.csv`, res.MESSAGE ?? [], [
            { header: "ID", accessor: (d: Driver) => d.id },
            { header: "Name", accessor: (d: Driver) => d.name },
            { header: "Phone", accessor: (d: Driver) => d.phone },
            { header: "Email", accessor: (d: Driver) => d.email },
            { header: "Approval Status", accessor: (d: Driver) => d.approvalStatus },
            { header: "Registration Status", accessor: (d: Driver) => d.registrationStatus },
            { header: "Subscription Status", accessor: (d: Driver) => d.subscriptionStatus },
            { header: "Blocked", accessor: (d: Driver) => d.isBlocked },
            { header: "Online", accessor: (d: Driver) => d.isOnline },
            { header: "Rating", accessor: (d: Driver) => d.rating },
            { header: "Total Rides", accessor: (d: Driver) => d.totalRides },
            { header: "Created At", accessor: (d: Driver) => d.createdAt },
          ]);
        },
      },
    );
  };

  const handleToggleBlock = (driver: Driver) => {
    toggleBlockMutation.mutate({ id: driver.id, isBlocked: driver.isBlocked });
  };

  const handleBulkApprove = async () => {
    const results = await Promise.allSettled(
      selectedPendingDrivers.map((d) => approveMutation.mutateAsync({ id: d.id, note: "" })),
    );
    const failed = results.filter((r) => r.status === "rejected").length;
    const succeeded = results.length - failed;
    if (succeeded) toast.success(`Approved ${succeeded} driver${succeeded === 1 ? "" : "s"}`);
    if (failed) toast.error(`Failed to approve ${failed} driver${failed === 1 ? "" : "s"}`);
    setRowSelection({});
    queryClient.invalidateQueries({ queryKey: ["drivers"], refetchType: "active" });
  };

  const columns = useMemo(
    () =>
      getDriverColumns({
        onViewDetail: handleViewDetail,
        onEdit: handleEdit,
        onToggleBlock: handleToggleBlock,
      }),
    []
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Driver List
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {data?.COUNT ?? 0} Total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate("/drivers/register")}
            size="sm"
            className="gap-2 h-8 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <UserPlus className="h-4 w-4" /> Onboard New Driver
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={exportMutation.isPending}
            className="gap-2 h-8"
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>
      <AutoFilters
        schema={driverFilterSchema}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />
      {selectedPendingDrivers.length > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-sm text-foreground">
            {selectedPendingDrivers.length} pending driver{selectedPendingDrivers.length === 1 ? "" : "s"} selected
          </span>
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={approveMutation.isPending}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          >
            <CheckCheck className="h-4 w-4" /> Approve Selected
          </Button>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={drivers}
          pageCount={data?.PAGINATION?.totalPages || 0}
          pageIndex={(Number(controller.applied.page) || 1) - 1}
          pageSize={Number(controller.applied.limit) || 10}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) =>
            controller.apply({ limit: size, page: 1 })
          }
          isLoading={isLoading}
          isFetching={isFetching}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
        />
      </div>

      <CreateDriverDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      {editingDriver && (
        <EditDriverDialog
          open={!!editingDriver}
          onOpenChange={(open) => {
            if (!open) setEditingDriver(null);
          }}
          driver={editingDriver}
        />
      )}
    </div>
  );
}
