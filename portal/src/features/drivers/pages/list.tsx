import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Car } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDriverColumns } from "../components/column";
import { useDrivers, useToggleBlockDriver } from "../hooks";
import type { Driver } from "../types";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";


export const driverFilterSchema: FilterSchema = {
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
  const controller = useFilterController({
    limit: 10,
    page: 1,
  });

  const page = Number(controller.applied.page) || 1;

  const { data, isLoading, isFetching } = useDrivers({
    page,
    limit: 10,
    approvalStatus: controller.applied.approvalStatus || undefined,
  });
  const toggleBlockMutation = useToggleBlockDriver();

  const handleViewDetail = (driver: Driver) => {
    navigate(`/drivers/${driver.id}`);
  };

  const handleToggleBlock = (driver: Driver) => {
    toggleBlockMutation.mutate({ id: driver.id, isBlocked: driver.isBlocked });
  };

  const columns = useMemo(
    () =>
      getDriverColumns({
        onViewDetail: handleViewDetail,
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
      </div>
      <AutoFilters
        schema={driverFilterSchema}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.MESSAGE ?? []}
          pageCount={data?.PAGINATION?.totalPages || 0}
          pageIndex={(Number(controller.applied.page) || 1) - 1}
          pageSize={Number(controller.applied.limit) || 10}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) =>
            controller.apply({ limit: size, page: 1 })
          }
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
