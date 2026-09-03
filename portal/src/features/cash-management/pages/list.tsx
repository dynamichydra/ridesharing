import { useMemo, useState } from "react";
import {
  Banknote,
  Plus,
  TrendingUp,
  AlertTriangle,
  Receipt,
  DollarSign,
  Globe,
} from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getCashCollectionColumns, formatCurrencyAmount } from "../components/column";
import { useCashCollections, useVerifyCashCollection, useReportCashCollection } from "../hooks";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Reported", value: "reported" },
      { label: "Settled / Verified", value: "settled" },
      { label: "Mismatch", value: "mismatch" },
      { label: "Disputed", value: "disputed" },
    ],
  },
  currencyCode: {
    label: "Currency",
    operator: "equals",
    type: "select",
    field: "currencyCode",
    placeholder: "All Currencies",
    options: [
      { label: "INR (₹) - Indian Rupee", value: "INR" },
      { label: "USD ($) - US Dollar", value: "USD" },
      { label: "CAD (CA$) - Canadian Dollar", value: "CAD" },
      { label: "EUR (€) - Euro", value: "EUR" },
      { label: "GBP (£) - British Pound", value: "GBP" },
      { label: "AED (د.إ) - UAE Dirham", value: "AED" },
    ],
  },
  driverId: {
    label: "Driver ID",
    operator: "equals",
    type: "text",
    field: "driverId",
    placeholder: "Filter by Driver ID",
  },
};

export default function CashManagementList() {
  const controller = useFilterController();

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;
  const activeCurrency = (controller.applied.currencyCode as string) || "";

  const { data, isLoading, isFetching } = useCashCollections({
    status: (controller.applied.status as string) || "",
    currencyCode: activeCurrency,
    driverId: (controller.applied.driverId as string) || "",
    page,
    limit,
  });

  const verifyMutation = useVerifyCashCollection();
  const reportMutation = useReportCashCollection();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    rideId: "",
    driverId: "",
    expectedAmount: "",
    collectedAmount: "",
    commission: "",
    currencyCode: "INR",
  });

  const collections = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? collections.length;

  // Aggregate multi-currency financial statistics
  const currencyBreakdown = useMemo(() => {
    const map: Record<string, { collectedMinor: number; expectedMinor: number; commissionMinor: number; count: number }> = {};
    for (const c of collections) {
      const code = (c.currencyCode || "INR").toUpperCase();
      if (!map[code]) {
        map[code] = { collectedMinor: 0, expectedMinor: 0, commissionMinor: 0, count: 0 };
      }
      map[code].collectedMinor += c.collectedAmountMinor || 0;
      map[code].expectedMinor += c.expectedAmountMinor || 0;
      map[code].commissionMinor += c.platformCommissionMinor || 0;
      map[code].count += 1;
    }
    return map;
  }, [collections]);

  const currencyKeys = Object.keys(currencyBreakdown);

  const totalIssues = useMemo(
    () => collections.filter((c) => c.status === "mismatch" || c.status === "disputed").length,
    [collections]
  );

  const columns = useMemo(
    () =>
      getCashCollectionColumns((id) => {
        verifyMutation.mutate(id);
      }),
    [verifyMutation]
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expectedMinor = Math.round(parseFloat(reportForm.expectedAmount || "0") * 100);
    const collectedMinor = Math.round(parseFloat(reportForm.collectedAmount || "0") * 100);
    const commissionMinor = reportForm.commission
      ? Math.round(parseFloat(reportForm.commission) * 100)
      : Math.round(expectedMinor * 0.2);

    await reportMutation.mutateAsync({
      rideId: reportForm.rideId.trim(),
      driverId: reportForm.driverId.trim(),
      expectedAmountMinor: expectedMinor,
      collectedAmountMinor: collectedMinor,
      platformCommissionMinor: commissionMinor,
      currencyCode: reportForm.currencyCode || "INR",
    });

    setIsReportModalOpen(false);
    setReportForm({
      rideId: "",
      driverId: "",
      expectedAmount: "",
      collectedAmount: "",
      commission: "",
      currencyCode: "INR",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Cash Collections & Settlements
          </h1>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Collections ({currencyKeys.length} Currencies)
          </span>
        </div>

        <Button
          size="sm"
          onClick={() => setIsReportModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Record Collection
        </Button>
      </div>

      {/* Multi-Currency KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Collected */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Cash Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {currencyKeys.length === 0 ? (
              <div className="text-xl font-bold">0.00</div>
            ) : currencyKeys.length === 1 ? (
              <div className="text-2xl font-bold">
                {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].collectedMinor, currencyKeys[0])}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold">
                  {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].collectedMinor, currencyKeys[0])}
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] font-mono text-muted-foreground">
                  {currencyKeys.slice(1).map((code) => (
                    <span key={code} className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                      {formatCurrencyAmount(currencyBreakdown[code].collectedMinor, code)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">In-person passenger fares</p>
          </CardContent>
        </Card>

        {/* Expected Meter Fare */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Expected Meter Fare
            </CardTitle>
            <Receipt className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {currencyKeys.length === 0 ? (
              <div className="text-xl font-bold">0.00</div>
            ) : currencyKeys.length === 1 ? (
              <div className="text-2xl font-bold">
                {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].expectedMinor, currencyKeys[0])}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold">
                  {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].expectedMinor, currencyKeys[0])}
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] font-mono text-muted-foreground">
                  {currencyKeys.slice(1).map((code) => (
                    <span key={code} className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                      {formatCurrencyAmount(currencyBreakdown[code].expectedMinor, code)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">Calculated trip billings</p>
          </CardContent>
        </Card>

        {/* Platform Commission */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Platform Commission
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {currencyKeys.length === 0 ? (
              <div className="text-xl font-bold">0.00</div>
            ) : currencyKeys.length === 1 ? (
              <div className="text-2xl font-bold">
                {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].commissionMinor, currencyKeys[0])}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-lg font-bold">
                  {formatCurrencyAmount(currencyBreakdown[currencyKeys[0]].commissionMinor, currencyKeys[0])}
                </div>
                <div className="flex flex-wrap gap-1 text-[11px] font-mono text-muted-foreground">
                  {currencyKeys.slice(1).map((code) => (
                    <span key={code} className="bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                      {formatCurrencyAmount(currencyBreakdown[code].commissionMinor, code)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">Due from driver wallets</p>
          </CardContent>
        </Card>

        {/* Mismatches & Disputes */}
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Mismatches & Disputes
            </CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalIssues > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIssues}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires reconciliation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar with Multi-Currency Selector */}
      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {/* Main Table with Currency column & dynamic formatting */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={collections}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      {/* Record Cash Collection Dialog with Currency Selection */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              Record Cash Collection
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log a multi-currency cash collection and deduct platform commission from driver's wallet.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rep-ride" className="text-xs">Ride ID *</Label>
              <Input
                id="rep-ride"
                value={reportForm.rideId}
                onChange={(e) => setReportForm((p) => ({ ...p, rideId: e.target.value }))}
                placeholder="UUID of completed ride"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-driver" className="text-xs">Driver ID *</Label>
              <Input
                id="rep-driver"
                value={reportForm.driverId}
                onChange={(e) => setReportForm((p) => ({ ...p, driverId: e.target.value }))}
                placeholder="UUID of collecting driver"
                required
              />
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="rep-currency" className="text-xs flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Operating Currency *
              </Label>
              <select
                id="rep-currency"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors"
                value={reportForm.currencyCode}
                onChange={(e) => setReportForm((p) => ({ ...p, currencyCode: e.target.value }))}
                required
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="CAD">CAD (CA$) - Canadian Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rep-exp" className="text-xs">
                  Expected Fare ({reportForm.currencyCode}) *
                </Label>
                <Input
                  id="rep-exp"
                  type="number"
                  step="0.01"
                  value={reportForm.expectedAmount}
                  onChange={(e) => setReportForm((p) => ({ ...p, expectedAmount: e.target.value }))}
                  placeholder="e.g. 50.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rep-col" className="text-xs">
                  Collected Fare ({reportForm.currencyCode}) *
                </Label>
                <Input
                  id="rep-col"
                  type="number"
                  step="0.01"
                  value={reportForm.collectedAmount}
                  onChange={(e) => setReportForm((p) => ({ ...p, collectedAmount: e.target.value }))}
                  placeholder="e.g. 50.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-comm" className="text-xs">
                Platform Commission ({reportForm.currencyCode}, optional)
              </Label>
              <Input
                id="rep-comm"
                type="number"
                step="0.01"
                value={reportForm.commission}
                onChange={(e) => setReportForm((p) => ({ ...p, commission: e.target.value }))}
                placeholder="Defaults to 20%"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReportModalOpen(false)}
                className="text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={reportMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs cursor-pointer"
              >
                {reportMutation.isPending ? "Recording..." : "Record & Settle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
