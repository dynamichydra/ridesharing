import { useState, useMemo } from "react";
import { Plus, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { DataTable } from "@/components/data-table/data-table";
import {
  useDriverGroups,
  useCountryOptions,
  useCreateDriverGroup,
  useUpdateDriverGroup,
  useDeleteDriverGroup,
} from "../hooks";
import { getDriverGroupColumns } from "../components/column";
import { DriverGroupDialog } from "../components/dialog";
import { GroupMembersDialog } from "../components/members-dialog";
import type { DriverGroup, CreateDriverGroupPayload } from "../types";

export default function DriverGroupsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [countryId, setCountryId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DriverGroup | null>(null);

  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [activeGroupForMembers, setActiveGroupForMembers] = useState<DriverGroup | null>(null);

  const { data: countriesData } = useCountryOptions();
  const countries = countriesData?.MESSAGE || [];

  const { data, isLoading } = useDriverGroups({
    page,
    limit,
    countryId: countryId || undefined,
    search: searchTerm || undefined,
  });

  const createMutation = useCreateDriverGroup();
  const updateMutation = useUpdateDriverGroup();
  const deleteMutation = useDeleteDriverGroup();

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: DriverGroup) => {
    setEditingGroup(group);
    setDialogOpen(true);
  };

  const handleOpenMembers = (group: DriverGroup) => {
    setActiveGroupForMembers(group);
    setMembersDialogOpen(true);
  };

  const handleDelete = async (group: DriverGroup) => {
    if (
      !confirm(
        `Are you sure you want to delete '${group.name}'? All driver memberships will be removed.`
      )
    )
      return;
    await deleteMutation.mutateAsync(group.id);
  };

  const handleSubmitGroup = async (payload: CreateDriverGroupPayload) => {
    if (editingGroup) {
      await updateMutation.mutateAsync({ id: editingGroup.id, payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const columns = useMemo(
    () =>
      getDriverGroupColumns({
        onEdit: handleOpenEdit,
        onManageMembers: handleOpenMembers,
        onDelete: handleDelete,
        countries,
      }),
    [countries]
  );

  const rows = (data as any)?.MESSAGE ?? (data as any)?.MESSAGE?.rows ?? [];
  const pagination = (data as any)?.PAGINATION ?? (data as any)?.MESSAGE?.pagination;
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Driver Groups & Cohorts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Segment drivers into cohorts (e.g. EV Drivers, Airport Fleet, VIP Chauffeurs) to target special plan pricing and perks.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 cursor-pointer shrink-0">
          <Plus className="h-4 w-4" /> Create Driver Group
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups by name or code…"
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="w-full sm:w-64">
          <NativeSelect
            value={countryId}
            onChange={(e) => {
              setCountryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Countries</option>
            {countries.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border border-border bg-card shadow-sm">
        <DataTable
          columns={columns}
          data={rows}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={(pageIndex) => setPage(pageIndex + 1)}
          isLoading={isLoading}
        />
      </div>

      {/* Modals */}
      <DriverGroupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={editingGroup}
        countries={countries}
        onSubmit={handleSubmitGroup}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <GroupMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        group={activeGroupForMembers}
      />
    </div>
  );
}
