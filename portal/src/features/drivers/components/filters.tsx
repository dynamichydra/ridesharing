import { AutoFilters } from "@/components/filters/AutoFilters";
import type { FilterSchema } from "@/components/filters/AutoFilters";
import type { useFilterController } from "@/components/filters/useFilterController";

export const driverFilterSchema: FilterSchema = {
  approvalStatus: {
    label: "Verification Status",
    operator: "equals",
    type: "select",
    options: [
      { label: "Pending Review", value: "pending" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
};

interface DriverFiltersProps {
  controller: ReturnType<typeof useFilterController>;
  isFetching?: boolean;
}

export function DriverFilters({ controller, isFetching }: DriverFiltersProps) {
  return <AutoFilters schema={driverFilterSchema} controller={controller} isFetching={isFetching} />;
}
