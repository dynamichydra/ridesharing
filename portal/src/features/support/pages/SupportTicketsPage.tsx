import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Ticket,
  AlertTriangle,
  Clock,
  UserCheck,
  Search,
  RefreshCw,
  MessageSquare,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supportApi } from "../api";
import type { SupportTicket, TicketStatus, TicketPriority } from "../types";
import toast from "react-hot-toast";

export default function SupportTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [status, setStatus] = useState<string>("all");
  const [userType, setUserType] = useState<string>("all");
  const [priority, setPriority] = useState<string>("all");
  const [slaBreached, setSlaBreached] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await supportApi.getTickets({
        page,
        limit: 15,
        status: status !== "all" ? status : undefined,
        userType: userType !== "all" ? userType : undefined,
        priority: priority !== "all" ? priority : undefined,
        slaBreached: slaBreached === "breached" ? true : undefined,
        query: searchQuery || undefined,
      });

      setTickets(res.MESSAGE || []);
      if (res.PAGINATION) {
        setTotalItems(res.PAGINATION.total || res.COUNT || 0);
        setTotalPages(res.PAGINATION.totalPages || 1);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load support tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, status, userType, priority, slaBreached]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const handleQuickAssign = async (ticketId: string) => {
    try {
      await supportApi.assignTicket(ticketId);
      toast.success("Ticket assigned to you");
      fetchTickets();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign ticket");
    }
  };

  // Metrics calculation
  const openCount = tickets.filter(t => t.status === "open").length;
  const urgentCount = tickets.filter(t => t.priority === "urgent" || t.priority === "high").length;
  const breachedCount = tickets.filter(t => t.slaBreached).length;
  const unassignedCount = tickets.filter(t => !t.assignedAdminId).length;

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "urgent":
        return <Badge className="bg-red-600 text-white animate-pulse">URGENT</Badge>;
      case "high":
        return <Badge className="bg-orange-500 text-white">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-blue-500 text-white">MEDIUM</Badge>;
      case "low":
        return <Badge className="bg-gray-500 text-white">LOW</Badge>;
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "open":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 font-semibold">Open</Badge>;
      case "assigned":
        return <Badge variant="outline" className="border-purple-500 text-purple-600 font-semibold">Assigned</Badge>;
      case "pending_user":
        return <Badge variant="outline" className="border-amber-500 text-amber-600 font-semibold">Pending User</Badge>;
      case "resolved":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600 font-semibold">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" className="border-gray-400 text-gray-600 font-semibold">Closed</Badge>;
    }
  };

  const formatSlaTimer = (slaDueAt: string, isBreached: boolean) => {
    if (isBreached) {
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-red-600">
          <AlertTriangle className="size-3" /> SLA BREACHED
        </span>
      );
    }
    const due = new Date(slaDueAt).getTime();
    const now = Date.now();
    const diffMin = Math.round((due - now) / 60000);

    if (diffMin <= 0) {
      return (
        <span className="flex items-center gap-1 text-xs font-bold text-red-600">
          <AlertTriangle className="size-3" /> Overdue
        </span>
      );
    }

    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
        <Clock className="size-3" /> {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} left
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Support Operations Queue</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer & driver tickets, SLAs, agent queue assignments, and live resolutions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/support/faqs")}>
            <Plus className="size-4 mr-2" /> FAQ & Categories
          </Button>
          <Button variant="default" size="sm" onClick={fetchTickets} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <Ticket className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High / Urgent Priority</CardTitle>
            <AlertTriangle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA Breaches</CardTitle>
            <Clock className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breachedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Exceeded resolution limit</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unassigned Queue</CardTitle>
            <UserCheck className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for agent pick</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Status Tabs */}
            <Tabs value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
              <TabsList className="bg-muted p-1">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="pending_user">Pending User</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Ticket # or subject..."
                    className="pl-8 w-48 lg:w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </form>

              <Select value={userType} onValueChange={(val) => { setUserType(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="User Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={(val) => { setPriority(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={slaBreached} onValueChange={(val) => { setSlaBreached(val); setPage(1); }}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="SLA Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All SLA</SelectItem>
                  <SelectItem value="breached">Breached Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Ticket #</TableHead>
                <TableHead>User Role</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA Timer</TableHead>
                <TableHead>Assigned Agent</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading support tickets...
                  </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No tickets found matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                tickets.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono font-bold text-sm text-primary">
                      {t.ticketNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.userType === "rider" ? "secondary" : "default"} className="capitalize">
                        {t.userType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate font-medium" title={t.subject}>
                      {t.subject}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.categoryName || "General Support"}
                    </TableCell>
                    <TableCell>{getPriorityBadge(t.priority)}</TableCell>
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell>{formatSlaTimer(t.slaDueAt, t.slaBreached)}</TableCell>
                    <TableCell className="text-sm">
                      {t.assignedAdminName ? (
                        <span className="font-medium text-foreground">{t.assignedAdminName}</span>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-blue-600 hover:bg-blue-50"
                          onClick={() => handleQuickAssign(t.id)}
                        >
                          + Assign Me
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/support/tickets/${t.id}`)}
                      >
                        <MessageSquare className="size-3.5 mr-1" /> Open Chat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              Showing {tickets.length} of {totalItems} tickets
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
