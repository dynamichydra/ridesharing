import { useMemo, useState } from "react";
import { Plus, ArrowLeftRight, TrendingUp, DollarSign, RefreshCw, Calculator } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFxRateColumns } from "../components/column";
import { FxRateDialog } from "../components/dialog";
import { useFxRates, useDeleteFxRate, useConvertMoney } from "../hooks";
import type { FxRate } from "../types";

const CURRENCY_OPTIONS = ["USD", "INR", "CAD", "EUR", "GBP", "AED", "SGD", "AUD", "JPY"];

export default function FxRateList() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [baseFilter, setBaseFilter] = useState<string>("");
  const [quoteFilter, setQuoteFilter] = useState<string>("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Quick Converter Widget State
  const [calcAmount, setCalcAmount] = useState("100");
  const [calcBase, setCalcBase] = useState("USD");
  const [calcQuote, setCalcQuote] = useState("INR");
  const [calcResult, setCalcResult] = useState<number | null>(null);

  const { data, isLoading, isFetching } = useFxRates({
    baseCurrency: baseFilter || undefined,
    quoteCurrency: quoteFilter || undefined,
    page,
    limit,
  });

  const deleteMutation = useDeleteFxRate();
  const convertMutation = useConvertMoney();

  const rates: FxRate[] = (data?.MESSAGE as any) || [];
  const pagination = (data?.PAGINATION as any) || {
    total: rates.length,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const handleDelete = (rate: FxRate) => {
    if (
      window.confirm(
        `Are you sure you want to delete exchange rate for ${rate.baseCurrency} to ${rate.quoteCurrency}?`
      )
    ) {
      deleteMutation.mutate(rate.id);
    }
  };

  const handleConvert = () => {
    const num = parseFloat(calcAmount);
    if (isNaN(num) || num <= 0) return;

    convertMutation.mutate(
      {
        amountMinor: Math.round(num * 100),
        baseCurrency: calcBase,
        quoteCurrency: calcQuote,
        baseExponent: 2,
        quoteExponent: 2,
      },
      {
        onSuccess: (res) => {
          setCalcResult(res.convertedAmountMinor / 100);
        },
      }
    );
  };

  const columns = useMemo(
    () =>
      getFxRateColumns({
        onDelete: handleDelete,
      }),
    []
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ArrowLeftRight className="h-6 w-6 text-primary" />
            Foreign Exchange Rates (FX)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage international multi-currency exchange rates, locked checkout quotes, and automatic conversions.
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Add Exchange Rate
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Configured Rates
            </CardTitle>
            <ArrowLeftRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pagination.total || rates.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active currency pairs</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Redis In-Memory Cache
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">Active (1h TTL)</div>
            <p className="text-xs text-muted-foreground mt-1">Sub-millisecond lookup latency</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Dynamic Inverses
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Enabled</div>
            <p className="text-xs text-muted-foreground mt-1">Reciprocal rate calculation (1 / R)</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Quote Rate Lock
            </CardTitle>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">15 Minutes</div>
            <p className="text-xs text-muted-foreground mt-1">Checkout slippage protection</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Quick Converter Widget */}
      <Card className="bg-gradient-to-r from-card to-accent/20 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Live Rate Calculator & Converter
          </CardTitle>
          <CardDescription>
            Test real-time conversion between operational currencies using live database and Redis rates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label htmlFor="calcAmount" className="text-xs">Amount</Label>
              <Input
                id="calcAmount"
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="100.00"
              />
            </div>

            <div className="space-y-1.5 w-32">
              <Label className="text-xs">From</Label>
              <Select value={calcBase} onValueChange={setCalcBase}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-32">
              <Label className="text-xs">To</Label>
              <Select value={calcQuote} onValueChange={setCalcQuote}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
              className="shrink-0"
            >
              {convertMutation.isPending ? "Converting..." : "Convert"}
            </Button>

            {calcResult !== null && (
              <div className="flex items-center px-4 py-2 bg-primary/10 border border-primary/20 rounded-md shrink-0">
                <span className="text-sm font-medium text-foreground">
                  Result: <strong className="text-primary font-mono text-base">{calcResult.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {calcQuote}</strong>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rates Data Table */}
      <Card className="border-border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Active Exchange Rate Records</CardTitle>
            <CardDescription>
              All configured base-to-quote conversion multipliers in the system.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={baseFilter}
              onValueChange={(val) => {
                setBaseFilter(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Base Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Bases</SelectItem>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={quoteFilter}
              onValueChange={(val) => {
                setQuoteFilter(val === "ALL" ? "" : val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-9 text-xs">
                <SelectValue placeholder="Quote Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Quotes</SelectItem>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <DataTable
            columns={columns as any}
            data={rates}
            pageIndex={page - 1}
            pageSize={limit}
            pageCount={pagination.totalPages || 1}
            onPageChange={(newPageIndex: number) => setPage(newPageIndex + 1)}
            onPageSizeChange={(newPageSize: number) => {
              setLimit(newPageSize);
              setPage(1);
            }}
            isLoading={isLoading}
            isFetching={isFetching}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <FxRateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  );
}
