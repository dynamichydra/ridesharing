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
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Eye,
  Check,
  X,
  Ban,
  FileText,
  Truck,
  User,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import Loader from "@/components/fullpage-loader";

interface Driver {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  profilePhoto: string | null;
  licenseNumber: string | null;
  licenseDoc: string | null;
  aadharNumber: string | null;
  aadharDoc: string | null;
  vehicleTypeId: string | null;
  vehicleNumber: string | null;
  vehicleModel: string | null;
  vehiclePhoto: string | null;
  vehicleYear: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  approvalNote: string | null;
  isOnline: boolean;
  isBlocked: boolean;
  rating: string;
  totalRides: number;
  subscriptionStatus: string;
}



export default function DriverList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<string>("");
  const [approvalStatusDraft, setApprovalStatusDraft] = useState<string>("");
  const [page, setPage] = useState(1);

  const handleSearchSubmit = () => {
    setSearch(searchDraft);
    setApprovalStatus(approvalStatusDraft);
    setPage(1);
  };

  const handleSearchReset = () => {
    setSearchDraft("");
    setApprovalStatusDraft("");
    setSearch("");
    setApprovalStatus("");
    setPage(1);
  };
  
  // Modals status
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [approvalNote, setApprovalNote] = useState("");
  const [isApproveOpen, setIsApproveOpen] = useState(false);

  // Fetch Drivers
  const { data, isLoading } = useQuery({
    queryKey: ["drivers", approvalStatus, page],
    queryFn: () => {
      let url = `/drivers?page=${page}&limit=10`;
      if (approvalStatus) url += `&approvalStatus=${approvalStatus}`;
      return apiClient.get<Driver[]>(url);
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      apiClient.post(`/drivers/${id}/approve`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver approved successfully!");
      setIsApproveOpen(false);
      setIsDocsOpen(false);
      setApprovalNote("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve driver");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      apiClient.post(`/drivers/${id}/reject`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success("Driver application rejected");
      setIsRejectOpen(false);
      setIsDocsOpen(false);
      setRejectionNote("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject driver");
    },
  });

  // Block/Unblock mutation
  const toggleBlockMutation = useMutation({
    mutationFn: ({ id, isBlocked }: { id: string; isBlocked: boolean }) =>
      apiClient.post(`/drivers/${id}/${isBlocked ? "unblock" : "block"}`, {}),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      toast.success(variables.isBlocked ? "Driver unblocked" : "Driver blocked");
    },
    onError: (err: any) => {
      toast.error(err.message || "Operation failed");
    },
  });

  if (isLoading) return <Loader />;

  const drivers = data?.MESSAGE || [];
  const pagination = data?.PAGINATION;

  const handleOpenDocs = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDocsOpen(true);
  };

  const handleApproveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    approveMutation.mutate({ id: selectedDriver.id, note: approvalNote });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) return;
    if (!rejectionNote.trim()) {
      toast.error("Rejection note is required");
      return;
    }
    rejectMutation.mutate({ id: selectedDriver.id, note: rejectionNote });
  };

  const handleToggleBlock = (driver: Driver) => {
    toggleBlockMutation.mutate({ id: driver.id, isBlocked: driver.isBlocked });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Drivers Directory</h2>
        <p className="text-muted-foreground mt-1">Approve onboarding applications, review license/aadhar uploads, and manage block lists.</p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Drivers Registry</CardTitle>
          <CardDescription>Onboarded and applying partners on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter drivers by name/phone..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                className="pl-9"
              />
            </div>
            <select
              value={approvalStatusDraft}
              onChange={(e) => setApprovalStatusDraft(e.target.value)}
              className="bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">All Verification Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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
                  <th className="px-6 py-4 font-semibold">Driver details</th>
                  <th className="px-6 py-4 font-semibold">Vehicle</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Approval</th>
                  <th className="px-6 py-4 font-semibold">Subscription</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drivers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                      No drivers match your filters.
                    </td>
                  </tr>
                ) : (
                  drivers
                    .filter((d) => {
                      if (!search) return true;
                      const text = `${d.name || ""} ${d.phone || ""}`.toLowerCase();
                      return text.includes(search.toLowerCase());
                    })
                    .map((driver) => (
                      <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {driver.name || "Unnamed Driver"}
                            {driver.isOnline && (
                              <span className="flex h-2 w-2 rounded-full bg-green-500" title="Online" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{driver.phone}</div>
                          <div className="text-xs text-amber-500 font-medium">★ {driver.rating} ({driver.totalRides} rides)</div>
                        </td>
                        <td className="px-6 py-4">
                          {driver.vehicleNumber ? (
                            <div>
                              <div className="font-medium text-foreground">{driver.vehicleNumber}</div>
                              <div className="text-xs text-muted-foreground">{driver.vehicleModel} ({driver.vehicleYear})</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No Vehicle Registered</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {driver.isBlocked ? (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Blocked
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              driver.approvalStatus === "approved"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : driver.approvalStatus === "rejected"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                            }`}
                          >
                            {driver.approvalStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              driver.subscriptionStatus === "active"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                : "bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-400"
                            }`}
                          >
                            {driver.subscriptionStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDocs(driver)}
                            className="text-xs border-border text-foreground hover:bg-muted font-medium cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Review
                          </Button>
                          <Button
                            variant={driver.isBlocked ? "outline" : "destructive"}
                            size="sm"
                            onClick={() => handleToggleBlock(driver)}
                            className="text-xs font-medium cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            {driver.isBlocked ? "Unblock" : "Block"}
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

      {/* Docs Verification Dialog */}
      <Dialog open={isDocsOpen} onOpenChange={setIsDocsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Registration Review</DialogTitle>
            <DialogDescription>
              Verify drivers license, identity credentials, and vehicle documentation.
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-6 py-4">
              {/* Profile info */}
              <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {selectedDriver.profilePhoto ? (
                    <img src={selectedDriver.profilePhoto} alt="Profile" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedDriver.name || "Unnamed Driver"}</h3>
                  <p className="text-sm text-muted-foreground">{selectedDriver.phone} | {selectedDriver.email || "No Email"}</p>
                </div>
              </div>

              {/* Grid document info */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Identity Cards */}
                <div className="space-y-4 border border-border p-4 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                    <FileText className="h-4 w-4" /> Identity Credentials
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block">Aadhar UID number</span>
                      <span className="text-sm font-medium">{selectedDriver.aadharNumber || "Not provided"}</span>
                    </div>
                    {selectedDriver.aadharDoc && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">Aadhar Document Proof</span>
                        <a href={selectedDriver.aadharDoc} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold hover:underline">
                          View Uploaded Document Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver License */}
                <div className="space-y-4 border border-border p-4 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                    <FileText className="h-4 w-4" /> Driving License
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground block">License Number</span>
                      <span className="text-sm font-medium">{selectedDriver.licenseNumber || "Not provided"}</span>
                    </div>
                    {selectedDriver.licenseDoc && (
                      <div>
                        <span className="text-xs text-muted-foreground block mb-1">License Copy</span>
                        <a href={selectedDriver.licenseDoc} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold hover:underline">
                          View License Copy Link
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vehicle parameters */}
              <div className="border border-border p-4 rounded-lg space-y-4">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                  <Truck className="h-4 w-4" /> Vehicle Verification
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Vehicle Number</span>
                    <span className="font-medium">{selectedDriver.vehicleNumber || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Make / Model</span>
                    <span className="font-medium">{selectedDriver.vehicleModel || "—"}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Year of Mfg</span>
                    <span className="font-medium">{selectedDriver.vehicleYear || "—"}</span>
                  </div>
                </div>
                {selectedDriver.vehiclePhoto && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Vehicle Photo Reference</span>
                    <a href={selectedDriver.vehiclePhoto} target="_blank" rel="noreferrer" className="text-primary text-xs font-semibold hover:underline">
                      View Vehicle Photo Link
                    </a>
                  </div>
                )}
              </div>

              {/* Approval status banner */}
              {selectedDriver.approvalStatus !== "pending" && (
                <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                  <strong>Onboarding Note:</strong> {selectedDriver.approvalNote || "No note recorded."}
                </div>
              )}

              {/* Decision Actions */}
              {selectedDriver.approvalStatus === "pending" && (
                <div className="flex gap-2 justify-end pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setIsRejectOpen(true)}
                    className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject Application
                  </Button>
                  <Button
                    onClick={() => setIsApproveOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Approve Partner
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve application prompt */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Approve Partner Application</DialogTitle>
            <DialogDescription>
              Provide onboarding remarks or notes for driver's activation logs.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApproveSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="approve-note">Onboarding Notes (Optional)</Label>
              <Textarea
                id="approve-note"
                placeholder="e.g. All documents verified clean. Activated."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApproveOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white cursor-pointer" disabled={approveMutation.isPending}>
                Complete Approval
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rejection Note input Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              A rejection note is required to specify reasons (e.g. Blurry driving license upload).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRejectSubmit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="reject-note">Rejection Note <span className="text-red-500">*</span></Label>
              <Textarea
                id="reject-note"
                placeholder="Specify rejection reason details..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRejectOpen(false)} className="cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white cursor-pointer" disabled={rejectMutation.isPending}>
                Submit Rejection
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
