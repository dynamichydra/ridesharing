import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getPayoutAccountColumns } from "../components/payout-account-column";
import { RejectPayoutAccountDialog } from "../components/reject-payout-account-dialog";
import { InstantPayoutDialog } from "../components/instant-payout-dialog";
import { usePayoutAccounts, useVerifyPayoutAccount } from "../hooks";
import type { PayoutAccount, PayoutAccountListParams, Pagination } from "../types";

const FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
};

export default function PayoutAccountsTab() {
  const controller = useFilterController();
  const [rejectTarget, setRejectTarget] = useState<PayoutAccount | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [payNowDriverId, setPayNowDriverId] = useState<string | null>(null);
  const [isPayNowOpen, setIsPayNowOpen] = useState(false);

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = usePayoutAccounts({
    status: (controller.applied.status as PayoutAccountListParams["status"]) || "",
    page,
    limit,
  });
  const verifyMutation = useVerifyPayoutAccount();

  const accounts = data?.MESSAGE || [];
  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? accounts.length;

  const handleApprove = (account: PayoutAccount) => {
    verifyMutation.mutate({ id: account.id, payload: { approve: true } });
  };

  const handleReject = (account: PayoutAccount) => {
    setRejectTarget(account);
    setIsRejectOpen(true);
  };

  const handlePayNow = (account: PayoutAccount) => {
    setPayNowDriverId(account.driverId);
    setIsPayNowOpen(true);
  };

  const columns = useMemo(
    () => getPayoutAccountColumns({ onApprove: handleApprove, onReject: handleReject, onPayNow: handlePayNow }),
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payout Accounts</h3>
          <p className="text-xs text-muted-foreground">
            {totalRecords} driver payout accounts. Approve before a driver can receive payouts.
          </p>
        </div>
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
          onPageChange={(pageIndex) => controller.apply({ page: pageIndex + 1 })}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <RejectPayoutAccountDialog open={isRejectOpen} onOpenChange={setIsRejectOpen} account={rejectTarget} />
      <InstantPayoutDialog open={isPayNowOpen} onOpenChange={setIsPayNowOpen} driverId={payNowDriverId ?? undefined} />
    </div>
  );
}
