import { useMemo, useState } from "react";
import {
  Building2,
  Plus,
  CreditCard,
  TrendingUp,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getCorporateAccountColumns } from "../components/column";
import { CreateCorporateDialog, AddCorporateUserDialog } from "../components/dialog";
import { GenerateInvoiceDialog } from "../components/invoice-dialog";
import { useCorporateAccounts } from "../hooks";
import type { CorporateAccount } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Active", value: "active" },
      { label: "Suspended", value: "suspended" },
      { label: "Closed", value: "closed" },
    ],
  },
};

export default function CorporateList() {
  const controller = useFilterController();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CorporateAccount | null>(null);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useCorporateAccounts({
    status: (controller.applied.status as string) || "",
    page,
    limit,
  });

  const accounts = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as any;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? accounts.length;

  // Aggregate KPI stats
  const totalCreditLimitMinor = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.creditLimitMinor || 0), 0),
    [accounts]
  );
  const totalExposureMinor = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.currentExposureMinor || 0), 0),
    [accounts]
  );
  const totalAvailableMinor = useMemo(
    () => Math.max(0, totalCreditLimitMinor - totalExposureMinor),
    [totalCreditLimitMinor, totalExposureMinor]
  );

  const handleAddUser = (account: CorporateAccount) => {
    setSelectedAccount(account);
    setIsAddUserOpen(true);
  };

  const handleGenerateInvoice = (account: CorporateAccount) => {
    setSelectedAccount(account);
    setIsInvoiceOpen(true);
  };

  const columns = useMemo(
    () =>
      getCorporateAccountColumns({
        onAddUser: handleAddUser,
        onGenerateInvoice: handleGenerateInvoice,
      }),
    []
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Corporate & B2B Billing
          </h1>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Accounts
          </span>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer text-xs gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          New Corporate Account
        </Button>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Corporate Accounts
            </CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {accounts.filter((a) => a.status === "active").length} active B2B partners
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Credit Line
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalCreditLimitMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved corporate credit</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Current B2B Exposure
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalExposureMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending uninvoiced trips</p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Available Credit
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalAvailableMinor / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for employee booking</p>
          </CardContent>
        </Card>
      </div>

      {/* AutoFilters */}
      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      {/* Accounts DataTable */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <DataTable
          columns={columns}
          data={accounts}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      {/* Create Account Dialog */}
      <CreateCorporateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      {/* Link User / Employee Dialog */}
      <AddCorporateUserDialog
        open={isAddUserOpen}
        onOpenChange={(open) => {
          setIsAddUserOpen(open);
          if (!open) setSelectedAccount(null);
        }}
        account={selectedAccount}
      />

      {/* Generate Periodic Invoice Dialog */}
      <GenerateInvoiceDialog
        open={isInvoiceOpen}
        onOpenChange={(open) => {
          setIsInvoiceOpen(open);
          if (!open) setSelectedAccount(null);
        }}
        account={selectedAccount}
      />
    </div>
  );
}
