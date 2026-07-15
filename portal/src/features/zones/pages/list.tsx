import { useCallback, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";

import { getZoneColumns } from "../components/column";
import { ZoneFormDialog, DeleteZoneDialog } from "../components/dialog";
import { useZones, useDeleteZone } from "../hooks";
import type { Zone, Pagination } from "../types";

export default function ZoneList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data, isLoading } = useZones({ page, limit: 10 });
  const deleteMutation = useDeleteZone();

  const zones = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? zones.length;

  const refreshList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["zones"], refetchType: "active" });
  }, [queryClient]);

  const handleOpenCreate = () => {
    setSelectedZone(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = useCallback((zone: Zone) => {
    setSelectedZone(zone);
    setIsEditOpen(true);
  }, []);

  const handleOpenDelete = useCallback((zone: Zone) => {
    setSelectedZone(zone);
    setIsDeleteOpen(true);
  }, []);

  const handleDeleteConfirm = () => {
    if (!selectedZone) return;
    deleteMutation.mutate(selectedZone.id, {
      onSuccess: () => {
        setIsDeleteOpen(false);
        refreshList();
      },
    });
  };

  const columns = useMemo(
    () => getZoneColumns({ onEdit: handleOpenEdit, onDelete: handleOpenDelete }),
    [handleOpenEdit, handleOpenDelete]
  );

  const handlePageChange = (pageIndex: number) => {
    setPage(pageIndex + 1);
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading zones…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={handleOpenCreate}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Zone
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={zones}
          pageIndex={page - 1}
          pageCount={totalPages}
          totalRecords={totalRecords}
          onPageChange={handlePageChange}
        />
      </div>

      <ZoneFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        zone={null}
        onSuccess={() => {
          setIsCreateOpen(false);
          refreshList();
        }}
      />

      <ZoneFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        zone={selectedZone}
        onSuccess={() => {
          setIsEditOpen(false);
          refreshList();
        }}
      />

      <DeleteZoneDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        zone={selectedZone}
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}