import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table/data-table";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateRiderDialog } from "../components/dialog";

import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRiderColumns } from "../components/column";
import { useRiders, useUpdateRider } from "../hooks";
import type { Rider } from "../types";
import { Plus, User } from "lucide-react";

const FILTER_SCHEMA: FilterSchema = {
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
  const queryClient = useQueryClient();
  const controller = useFilterController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, isFetching } = useRiders({
    search: controller.applied.search,
    isVerified: toBool(controller.applied.isVerified),
    isBlocked: toBool(controller.applied.isBlocked),
    limit: 10,
    page: 1,
  });
  const updateMutation = useUpdateRider();

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["riders"],
      refetchType: "active",
    });
  }, [queryClient]);
  const handleOpenCreate = () => {
    setIsCreateOpen(true);
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

  const columns = useMemo(
    () =>
      getRiderColumns({
        onToggleVerify: handleToggleVerify,
        onToggleBlock: handleToggleBlock,
      }),
    [handleToggleVerify, handleToggleBlock],
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

        <Button
          onClick={() => handleOpenCreate()}
          size="sm"
          className="gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] h-8"
        >
          <Plus className="h-4 w-4" /> Create Rider
        </Button>
      </div>

      {/* Tighter Filter Section */}
      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <DataTable
        columns={columns}
        data={data?.MESSAGE ?? []}
        pageCount={data?.PAGINATION?.totalPages || 0}
        pageIndex={(Number(controller.applied.page) || 1) - 1}
        pageSize={Number(controller.applied.limit) || 10}
        onPageChange={handlePageChange}
        onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
        isLoading={isLoading}
        isFetching={isFetching}
      />

      <CreateRiderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={refreshList}
      />
    </div>
  );
}
