import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  UserPlus,
  Ban,
  UserCheck,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface Rider {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  avatar: string | null;
  isVerified: boolean;
  isBlocked: boolean;
  rating: string;
  totalRides: string;
  createdAt: string;
}


export default function UserList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRider, setNewRider] = useState({ name: "", phone: "", email: "", isVerified: false });

  // Query riders
  const { data, isLoading } = useQuery({
    queryKey: ["riders", search, page],
    queryFn: () =>
      apiClient.get<Rider[]>(`/riders?search=${search}&page=${page}&limit=10`),
  });

  // Create Rider mutation
  const createMutation = useMutation({
    mutationFn: (payload: typeof newRider) => apiClient.post("/riders", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      toast.success("User created successfully!");
      setIsCreateOpen(false);
      setNewRider({ name: "", phone: "", email: "", isVerified: false });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create user");
    },
  });

  // Update Rider mutation (block/unblock/verify)
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Rider> }) =>
      apiClient.patch(`/riders/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riders"] });
      toast.success("User updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user");
    },
  });

  if (isLoading) return <Loader />;

  const riders = data?.MESSAGE || [];
  const pagination = data?.PAGINATION;

  const handleToggleBlock = (rider: Rider) => {
    updateMutation.mutate({
      id: rider.id,
      payload: { isBlocked: !rider.isBlocked },
    });
  };

  const handleToggleVerify = (rider: Rider) => {
    updateMutation.mutate({
      id: rider.id,
      payload: { isVerified: !rider.isVerified },
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRider.name || !newRider.phone) {
      toast.error("Name and Phone number are required");
      return;
    }
    createMutation.mutate(newRider);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Users Management</h2>
          <p className="text-muted-foreground mt-1">View, search, verify and configure registered platform users.</p>
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
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-sm text-left text-foreground">
              <thead className="text-xs uppercase bg-muted text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Name</th>
                  <th className="px-6 py-4 font-semibold">Phone</th>
                  <th className="px-6 py-4 font-semibold">Email</th>
                  <th className="px-6 py-4 font-semibold">Verified</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Rides / Rating</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {riders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No riders found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  riders.map((rider) => (
                    <tr key={rider.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {rider.name ? rider.name[0].toUpperCase() : "U"}
                        </div>
                        {rider.name || "Unnamed"}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{rider.phone}</td>
                      <td className="px-6 py-4 text-muted-foreground">{rider.email || "—"}</td>
                      <td className="px-6 py-4">
                        {rider.isVerified ? (
                          <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                            <CheckCircle className="h-4 w-4" /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <XCircle className="h-4 w-4" /> Unverified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {rider.isBlocked ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            Blocked
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground font-medium">
                        {rider.totalRides} rides / ★ {rider.rating}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleVerify(rider)}
                          className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          {rider.isVerified ? "Unverify" : "Verify"}
                        </Button>
                        <Button
                          variant={rider.isBlocked ? "outline" : "destructive"}
                          size="sm"
                          onClick={() => handleToggleBlock(rider)}
                          className="text-xs font-medium cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          {rider.isBlocked ? "Unblock" : "Block"}
                        </Button>
                      </td>
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
                  onClick={() => setPage(prev => prev - 1)}
                  className="cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(prev => prev + 1)}
                  className="cursor-pointer"
                >
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. John Doe"
                value={newRider.name}
                onChange={(e) => setNewRider(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. +919876543210"
                value={newRider.phone}
                onChange={(e) => setNewRider(prev => ({ ...prev, phone: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@example.com"
                value={newRider.email}
                onChange={(e) => setNewRider(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                id="isVerified"
                type="checkbox"
                checked={newRider.isVerified}
                onChange={(e) => setNewRider(prev => ({ ...prev, isVerified: e.target.checked }))}
                className="h-4 w-4 accent-primary rounded border-border"
              />
              <Label htmlFor="isVerified" className="cursor-pointer">Pre-verify user phone number</Label>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white cursor-pointer" disabled={createMutation.isPending}>
                Create User
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
