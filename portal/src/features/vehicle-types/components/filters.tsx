import {
  AutoFilters,
  type FilterSchema,
} from "@/components/filters/AutoFilters";
import type { useFilterController } from "@/components/filters/useFilterController";
import type { Country } from "../types";

type FilterController = ReturnType<typeof useFilterController>;

function getVehicleTypeFilterSchema(countries: Country[]): FilterSchema {
  return {
    countryId: {
      label: "Pricing Country",
      operator: "equals",
      type: "select",
      placeholder: "Select country for pricing",
      options: countries.map((c) => ({
        label: `${c.name} (${c.currencyCode})`,
        value: c.id,
      })),
    },
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
}

interface VehicleTypeFiltersProps {
  controller: FilterController;
  isFetching?: boolean;
  actions?: React.ReactNode;
  countries: Country[];
}

export function VehicleTypeFilters({
  controller,
  isFetching,
  actions,
  countries,
}: VehicleTypeFiltersProps) {
  const schema = getVehicleTypeFilterSchema(countries);

  return (
    <AutoFilters
      schema={schema}
      controller={controller}
      isFetching={isFetching}
      actions={actions}
      compact={true}
      className="border-none shadow-none bg-accent/20"
    />
  );
}