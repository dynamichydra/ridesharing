import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet as WalletIcon } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import { useFilterController } from "@/components/filters/useFilterController";
import { useGeoFilterSchema } from "@/features/geo/hooks";

import { getWalletColumns } from "../components/column";
import { useWallets } from "../hooks";
import type { WalletListItem, WalletOwnerType } from "../types";

const BASE_FILTER_SCHEMA: FilterSchema = {
  search: {
    label: "Search",
    operator: "equals",
    type: "text",
    field: "search",
    placeholder: "Search by owner name or phone...",
  },
  ownerType: {
    label: "Owner Type",
    operator: "equals",
    type: "select",
    field: "ownerType",
    placeholder: "All Owners",
    options: [
      { label: "Drivers", value: "driver" },
      { label: "Riders", value: "rider" },
    ],
  },
};

export default function WalletList() {
  const navigate = useNavigate();
  const controller = useFilterController({ page: 1, limit: 10 });
  const geoFilterSchema = useGeoFilterSchema(controller);
  const filterSchema: FilterSchema = { ...BASE_FILTER_SCHEMA, ...geoFilterSchema };

  const page = Number(controller.applied.page) || 1;
  const pageSize = Number(controller.applied.limit) || 10;

  const { data, isLoading, isFetching } = useWallets({
    page,
    limit: pageSize,
    search: controller.applied.search || undefined,
    ownerType: (controller.applied.ownerType as WalletOwnerType) || undefined,
    countryId: controller.applied.countryId || undefined,
    stateId: controller.applied.stateId || undefined,
    cityId: controller.applied.cityId || undefined,
  });

  const wallets = data?.MESSAGE ?? [];
  const totalPages = data?.PAGINATION?.totalPages || 0;

  const columns = useMemo(() => getWalletColumns(), []);

  const handleRowClick = (wallet: WalletListItem) => {
    navigate(wallet.ownerType === "driver" ? `/drivers/${wallet.ownerId}` : `/users/${wallet.ownerId}`);
  };

  const handlePageChange = (pageIndex: number) => {
    controller.apply({ page: pageIndex + 1 });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <WalletIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">Wallets</h2>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest bg-accent px-2 py-0.5 rounded-full opacity-70">
            {data?.COUNT ?? 0} Total
          </span>
        </div>
      </div>

      <AutoFilters
        schema={filterSchema}
        controller={controller}
        isFetching={isLoading}
        compact={true}
        className="border-none shadow-none bg-accent/20"
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={wallets}
          pageIndex={page - 1}
          pageSize={pageSize}
          pageCount={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={(size) => controller.apply({ limit: size, page: 1 })}
          onRowClick={handleRowClick}
          isLoading={isLoading}
          isFetching={isFetching}
        />
      </div>
    </div>
  );
}
