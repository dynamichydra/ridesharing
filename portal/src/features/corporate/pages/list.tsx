import { useMemo, useState } from "react";
import { Building2, Plus } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { Button } from "@/components/ui/button";

import { getCorporateAccountColumns } from "../components/column";
import { CreateCorporateDialog } from "../components/dialog";
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

  const handleAddUser = (account: CorporateAccount) => {
    setSelectedAccount(account);
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
    [],
  );

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Corporate & B2B Billing
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Accounts
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New Account
        </Button>
      </div>

      <AutoFilters
        schema={FILTER_SCHEMA}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
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

      <CreateCorporateDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

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
