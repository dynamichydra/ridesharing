import { useState } from "react";
import { UserCheck, UserMinus, Plus, Search, Phone, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  useGroupMembers,
  useAddGroupMembers,
  useRemoveGroupMember,
} from "../hooks";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { DriverGroup } from "../types";
import { formatDate } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: DriverGroup | null;
}

export function GroupMembersDialog({ open, onOpenChange, group }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverIdInput, setDriverIdInput] = useState("");

  const groupId = group?.id || "";

  const { data: membersData, isLoading } = useGroupMembers(groupId, page, 15, searchTerm);
  const addMutation = useAddGroupMembers(groupId);
  const removeMutation = useRemoveGroupMember(groupId);

  // Fetch approved drivers for selection
  const { data: driversData } = useQuery({
    queryKey: ["drivers-for-group-select", group?.countryId],
    queryFn: () => {
      const query = new URLSearchParams({
        page: "1",
        limit: "100",
        approvalStatus: "approved",
      });
      if (group?.countryId) query.set("countryId", group.countryId);
      return apiClient.get<any>(`/drivers?${query.toString()}`);
    },
    enabled: open && isAddOpen,
  });

  const availableDrivers: any[] = (driversData as any)?.MESSAGE?.rows ?? (driversData as any)?.MESSAGE ?? [];
  const members: any[] = (membersData as any)?.MESSAGE ?? (membersData as any)?.MESSAGE?.rows ?? [];
  const pagination: any = (membersData as any)?.PAGINATION ?? (membersData as any)?.MESSAGE?.pagination;

  const handleAddDriver = async () => {
    const idToAdd = selectedDriverId || driverIdInput.trim();
    if (!idToAdd) return;

    await addMutation.mutateAsync({
      driverIds: [idToAdd],
    });

    setSelectedDriverId("");
    setDriverIdInput("");
    setIsAddOpen(false);
  };

  const handleRemoveDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to remove this driver from the group?")) return;
    await removeMutation.mutateAsync(driverId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                {group?.name} <span className="text-xs font-mono text-muted-foreground">({group?.code})</span>
              </DialogTitle>
              <DialogDescription className="mt-1">
                Manage drivers assigned to this cohort. Drivers in this group qualify for targeted perks.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddOpen(!isAddOpen)}
              className="gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Driver
            </Button>
          </div>
        </DialogHeader>

        {/* Add Driver Drawer / Accordion */}
        {isAddOpen && (
          <div className="border border-border rounded-lg p-3 bg-muted/40 space-y-3">
            <div className="font-semibold text-sm text-foreground">Add Driver to Group</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Select from Active Drivers</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedDriverId}
                  onChange={(e) => {
                    setSelectedDriverId(e.target.value);
                    if (e.target.value) setDriverIdInput("");
                  }}
                >
                  <option value="">-- Choose a driver --</option>
                  {availableDrivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Or Enter Driver UUID</Label>
                <Input
                  placeholder="Paste Driver UUID"
                  className="h-9 text-xs"
                  value={driverIdInput}
                  onChange={(e) => {
                    setDriverIdInput(e.target.value);
                    if (e.target.value) setSelectedDriverId("");
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddDriver}
                disabled={(!selectedDriverId && !driverIdInput.trim()) || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding…" : "Confirm Add"}
              </Button>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search driver by name or phone…"
            className="pl-9 h-9"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Members List Table */}
        <div className="flex-1 overflow-y-auto min-h-[250px] border border-border rounded-lg mt-2 divide-y divide-border">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading group members…</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {searchTerm ? "No members found matching your search." : "No drivers currently assigned to this group."}
            </div>
          ) : (
            members.map((m: any) => (
              <div
                key={m.id}
                className="p-3 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {m.driver?.name?.charAt(0) || "D"}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      {m.driver?.name}
                      {m.driver?.rating && (
                        <span className="flex items-center text-xs font-normal text-amber-500 gap-0.5">
                          <Star className="h-3 w-3 fill-amber-500" /> {Number(m.driver.rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {m.driver?.phone}
                      </span>
                      <span>·</span>
                      <span>Assigned: {formatDate(m.assignedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={m.driver?.isOnline ? "default" : "secondary"}
                    className="text-[10px] px-1.5 py-0 capitalize"
                  >
                    {m.driver?.isOnline ? "Online" : "Offline"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                    title="Remove from group"
                    onClick={() => handleRemoveDriver(m.driver.id)}
                    disabled={removeMutation.isPending}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span>
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalItems} members)
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
