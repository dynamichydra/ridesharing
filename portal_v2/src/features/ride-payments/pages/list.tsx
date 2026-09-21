import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";

import { getRidePaymentColumns } from "../components/column";
import { useRidePayments } from "../hooks";
import { useCountryOptions } from "@/features/geo/hooks";
import { InitiateRefundDialog } from "@/features/refunds/components/dialog";
import type { RidePayment, RidePaymentListParams, Pagination } from "../types";

const BASE_FILTER_SCHEMA: FilterSchema = {
  status: {
    label: "Status",
    operator: "equals",
    type: "select",
    field: "status",
    placeholder: "All Statuses",
    options: [
      { label: "Created", value: "created" },
      { label: "Captured", value: "captured" },
      { label: "Failed", value: "failed" },
      { label: "Refunded", value: "refunded" },
    ],
  },
  paymentMethod: {
    label: "Method",
    operator: "equals",
    type: "select",
    field: "paymentMethod",
    placeholder: "All Methods",
    options: [
      { label: "Online", value: "online" },
      { label: "Cash", value: "cash" },
    ],
  },
  gateway: {
    label: "Gateway",
    operator: "equals",
    type: "select",
    field: "gateway",
    placeholder: "All Gateways",
    options: [
      { label: "Razorpay", value: "razorpay" },
      { label: "Stripe", value: "stripe" },
      { label: "Cash", value: "cash" },
    ],
  },
};

export default function RidePaymentList() {
  const controller = useFilterController();

  // Payments only carry a country — no state/city — so this is a single-level country
  // filter, not the full cascading useGeoFilterSchema.
  const { data: countriesData } = useCountryOptions();
  const FILTER_SCHEMA: FilterSchema = {
    ...BASE_FILTER_SCHEMA,
    countryId: {
      label: "Country",
      operator: "equals",
      type: "select",
      field: "countryId",
      placeholder: "All Countries",
      options: (countriesData?.MESSAGE ?? []).map((c) => ({ label: c.name, value: c.id })),
    },
  };

  const [refundPayment, setRefundPayment] = useState<RidePayment | null>(null);
  const [isRefundOpen, setIsRefundOpen] = useState(false);

  const handleRefund = (payment: RidePayment) => {
    setRefundPayment(payment);
    setIsRefundOpen(true);
  };

  const page = Number(controller.applied.page) || 1;
  const limit = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useRidePayments({
    status: (controller.applied.status as RidePaymentListParams["status"]) || "",
    paymentMethod: (controller.applied.paymentMethod as RidePaymentListParams["paymentMethod"]) || "",
    gateway: (controller.applied.gateway as RidePaymentListParams["gateway"]) || "",
    countryId: controller.applied.countryId || undefined,
    // Not shown in the visible filter bar — read from the URL so the "View all payments"
    // deep link from a rider/driver's detail page (?riderId=/?driverId=) pre-filters this list.
    riderId: controller.applied.riderId || undefined,
    driverId: controller.applied.driverId || undefined,
    page,
    limit,
  });

  const payments = data?.MESSAGE || [];

  const pagination = data?.PAGINATION as unknown as Pagination | undefined;
  const totalPages = pagination?.totalPages || 1;
  const totalRecords = pagination?.totalItems ?? payments.length;

  const columns = useMemo(() => getRidePaymentColumns({ onRefund: handleRefund }), []);

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Ride Payments
          </h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {totalRecords} Total
          </span>
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
          data={payments}
          pageIndex={page - 1}
          pageSize={limit}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>

      <InitiateRefundDialog
        open={isRefundOpen}
        onOpenChange={setIsRefundOpen}
        payment={
          refundPayment
            ? {
                paymentId: refundPayment.payment.id,
                remainingMinor: refundPayment.payment.amountMinor,
                currencyCode: refundPayment.payment.currencyCode,
              }
            : undefined
        }
      />
    </div>
  );
}
