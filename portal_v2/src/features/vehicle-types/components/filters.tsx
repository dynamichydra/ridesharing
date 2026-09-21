import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import type { useFilterController } from "@/components/filters/useFilterController";

type FilterController = ReturnType<typeof useFilterController>;

const FILTER_SCHEMA: FilterSchema = {
  name: {
    label: "Name",
    operator: "contains",
    type: "text",
    placeholder: "Search by name",
  },
  isActive: {
    label: "Status",
    operator: "equals",
    type: "select",
    options: [
      { label: "Active", value: "true" },
      { label: "Inactive", value: "false" },
    ],
  },
};

interface VehicleTypeFiltersProps {
  controller: FilterController;
  isFetching?: boolean;
  actions?: React.ReactNode;
}

export function VehicleTypeFilters({
  controller,
  isFetching,
  actions,
}: VehicleTypeFiltersProps) {
  return (
    <AutoFilters
      schema={FILTER_SCHEMA}
      controller={controller}
      isFetching={isFetching}
      actions={actions}
      compact={true}
      className="border-none shadow-none bg-accent/20"
    />
  );
}
