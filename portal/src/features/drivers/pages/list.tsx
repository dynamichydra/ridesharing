import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data-table/data-table";
import { useFilterController } from "@/components/filters/useFilterController";

import { getDriverColumns } from "../components/column";
import { DriverFilters } from "../components/filters";
import { useDrivers, useToggleBlockDriver } from "../hooks";
import type { Driver, Pagination } from "../types";

export default function DriverList() {
  const navigate = useNavigate();
  const controller = useFilterController();

  const [search, setSearch] = useState("");

  const page = Number(controller.applied.page) || 1;

  const { data, isLoading, isFetching } = useDrivers({
    page,
    limit: 10,
    approvalStatus: controller.applied.approvalStatus || undefined,
  });
  const toggleBlockMutation = useToggleBlockDriver();

  const drivers = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;

  const filteredDrivers = drivers.filter((d) => {
    if (!search) return true;
    const text = `${d.name || ""} ${d.phone || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

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
          onPageChange={handlePageChange}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
