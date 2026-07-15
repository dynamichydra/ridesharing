import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/data-table/data-table";

import { getRiderColumns } from "../components/column";
import { RiderFilters } from "../components/filters";
import { useRiders, useUpdateRider } from "../hooks";
import type { Rider, Pagination } from "../types";

export default function UserList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");

  const { data, isLoading } = useRiders({ search, page, limit: 10 });
  const updateMutation = useUpdateRider();

  const riders = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? riders.length;

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["riders"], refetchType: "active" });
  }, [queryClient]);

  const handleSearchSubmit = () => {
    setSearch(searchDraft);
    setPage(1);
  };

  const handleSearchReset = () => {
    setSearchDraft("");
    setSearch("");
    setPage(1);
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
    setPage(pageIndex + 1);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading users…</div>;
  }

  return (
    <div className="space-y-4">
      <RiderFilters
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        onSearch={handleSearchSubmit}
        onReset={handleSearchReset}
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={riders}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}