import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table/data-table";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { CreateRiderDialog } from "../components/dialog";

import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRiderColumns } from "../components/column";
import { useRiders, useUpdateRider } from "../hooks";
import type { Rider, Pagination } from "../types";


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
  const { draft, applied, setDraftValue, apply, reset } = useFilterController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const page = Number(applied.page) || 1;

  const { data, isLoading, isFetching } = useRiders({
    search: applied.search,
    isVerified: toBool(applied.isVerified),
    isBlocked: toBool(applied.isBlocked),
    page,
    limit: 10,
  });
  const updateMutation = useUpdateRider();

  const riders = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? riders.length;

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["riders"], refetchType: "active" });
  }, [queryClient]);
  const handleOpenCreate = () => {
  setIsCreateOpen(true);
};

  const handleToggleVerify = useCallback(
    (rider: Rider) => {
      updateMutation.mutate(
        { id: rider.id, payload: { isVerified: !rider.isVerified } },
        { onSuccess: refreshList }
      );
    },
    [updateMutation, refreshList]
  );

  const handleToggleBlock = useCallback(
    (rider: Rider) => {
      updateMutation.mutate(
        { id: rider.id, payload: { isBlocked: !rider.isBlocked } },
        { onSuccess: refreshList }
      );
    },
    [updateMutation, refreshList]
  );

  const columns = useMemo(
    () =>
      getRiderColumns({
        onToggleVerify: handleToggleVerify,
        onToggleBlock: handleToggleBlock,
      }),
    [handleToggleVerify, handleToggleBlock]
  );

  const handlePageChange = (pageIndex: number) => {
    apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <AutoFilters
  schema={FILTER_SCHEMA}
  controller={{ draft, setDraftValue, apply, reset }}
  isFetching={isFetching}
  actions={
    <Button
      onClick={handleOpenCreate}
      className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
    >
      <UserPlus className="h-4 w-4" />
      Add User
    </Button>
  }
  
/>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading users…</div>
        ) : (
          <DataTable
            columns={columns}
            data={riders}
            pageIndex={page - 1}
            pageCount={totalPages}
            totalRecords={totalRecords}
            onPageChange={handlePageChange}
          />
        )}
      </div>
          <CreateRiderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={refreshList}
      />
    </div>
  );
}