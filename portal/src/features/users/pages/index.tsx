import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, RotateCcw, Search, UserPlus } from "lucide-react";
import Loader from "@/components/fullpage-loader";
import { useRiders, useUpdateRider } from "@/features/users/hooks";
import { getRiderColumns } from "@/features/users/column";
import { CreateRiderDialog } from "@/features/users/dialog";
import type { Rider } from "@/features/users/types";

export default function UserList() {
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useRiders({ search, page, limit: 10 });
  const updateMutation = useUpdateRider();

  const handleSearchSubmit = () => {
    setSearch(searchDraft);
    setPage(1);
  };

  const handleSearchReset = () => {
    setSearchDraft("");
    setSearch("");
    setPage(1);
  };

  const handleToggleBlock = (rider: Rider) => {
    updateMutation.mutate({ id: rider.id, payload: { isBlocked: !rider.isBlocked } });
  };

  const handleToggleVerify = (rider: Rider) => {
    updateMutation.mutate({ id: rider.id, payload: { isVerified: !rider.isVerified } });
  };

  const columns = getRiderColumns({
    onToggleVerify: handleToggleVerify,
    onToggleBlock: handleToggleBlock,
  });

  if (isLoading) return <Loader />;

  const riders = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Users Management</h2>
          <p className="text-muted-foreground mt-1">
            View, search, verify and configure registered platform users.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Users Directory</CardTitle>
          <CardDescription>Users who can book rides using the customer application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchSubmit();
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center shrink-0">
              <Button
                onClick={handleSearchSubmit}
                variant="outline"
                className="rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="font-medium">Search</span>
              </Button>
              <Button
                onClick={handleSearchReset}
                variant="outline"
                className="rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground cursor-pointer"
                title="Reset Filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-6 py-4 font-semibold ${col.headerClassName ?? ""}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {riders.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground">
                      No riders found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  riders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className={`px-6 py-4 ${col.cellClassName ?? ""}`}>
                          {col.render(rider)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-muted-foreground">
                Showing Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((prev) => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRiderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}