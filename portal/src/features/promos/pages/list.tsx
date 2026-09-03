import { useMemo, useState } from "react";
import { Tag, Plus, CheckCircle2, TicketPercent, Users, Flame } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getPromoColumns } from "../components/column";
import { PromoDialog } from "../components/dialog";
import { usePromos, useTogglePromoStatus, useDeletePromo } from "../hooks";
import type { Promo } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  isActive: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "isActive",
    placeholder: "All Statuses",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
};

export default function PromoList() {
  const controller = useFilterController();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = usePromos({
    isActive: controller.applied.isActive !== undefined ? controller.applied.isActive : "",
    page,
    limit,
  });

  const toggleStatusMutation = useTogglePromoStatus();
  const deleteMutation = useDeletePromo();

  const promos = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? promos.length;

  // Aggregate KPI stats
  const activeCount = useMemo(() => promos.filter((p) => p.isActive).length, [promos]);
  const totalRedemptions = useMemo(
    () => promos.reduce((sum, p) => sum + (p.usedCount || 0), 0),
    [promos]
  );
  const percentageCount = useMemo(
    () =>
      promos.filter((p) => {
        const t = String(p.discountType || "").toLowerCase();
        return t === "percentage" || t === "percent";
      }).length,
    [promos]
  );

  const handleEdit = (promo: Promo) => {
    setEditingPromo(promo);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (promo: Promo) => {
    toggleStatusMutation.mutate({ id: promo.id, isActive: promo.isActive });
  };

  const handleDelete = (promo: Promo) => {
    if (window.confirm(`Are you sure you want to delete promo code "${promo.code}"?`)) {
      deleteMutation.mutate(promo.id);
    }
  };

  const columns = useMemo(
    () =>
      getPromoColumns({
        onEdit: handleEdit,
        onToggleStatus: handleToggleStatus,
        onDelete: handleDelete,
      }),
    [handleToggleStatus, handleDelete]
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Promotions & Coupons
          </h1>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Promos
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingPromo(null);
            setIsDialogOpen(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          New Promo
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Campaigns
            </CardTitle>
            <TicketPercent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecords}</div>
            <p className="text-xs text-muted-foreground mt-1">Configured discount codes</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Active Promos
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently usable by riders</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Redemptions
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRedemptions}</div>
            <p className="text-xs text-muted-foreground mt-1">Times applied by passengers</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Discount Mix
            </CardTitle>
            <Flame className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {percentageCount} <span className="text-sm font-normal text-muted-foreground">% / {promos.length - percentageCount} Flat</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Percentage vs flat deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {/* Promos Table */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={promos}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      {/* Create / Edit Dialog */}
      <PromoDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingPromo(null);
        }}
        promoToEdit={editingPromo}
      />
    </div>
  );
}
