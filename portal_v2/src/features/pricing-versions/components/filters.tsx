import React from "react";
import { AutoFilters, type FilterSchema } from "@/components/filters/AutoFilters";
import type { useFilterController } from "@/components/filters/useFilterController";

type FilterController = ReturnType<typeof useFilterController>;

interface OptionItem {
  id: string;
  name: string;
}

interface PricingVersionFiltersProps {
  controller: FilterController;
  isFetching?: boolean;
  vehicleTypes?: OptionItem[];
  countries?: OptionItem[];
  actions?: React.ReactNode;
}

export function PricingVersionFilters({
  controller,
  isFetching,
  vehicleTypes = [],
  countries = [],
  actions,
}: PricingVersionFiltersProps) {
  const schema: FilterSchema = React.useMemo(
    () => ({
      vehicleTypeId: {
        label: "Vehicle Type",
        operator: "equals",
        type: "select",
        field: "vehicleTypeId",
        placeholder: "All Vehicle Types",
        options: vehicleTypes.map((vt) => ({
          label: vt.name,
          value: vt.id,
        })),
      },
      countryId: {
        label: "Country",
        operator: "equals",
        type: "select",
        field: "countryId",
        placeholder: "All Countries",
        options: countries.map((c) => ({
          label: c.name,
          value: c.id,
        })),
      },
      isActive: {
        label: "Status",
        operator: "equals",
        type: "select",
        field: "isActive",
        placeholder: "All Statuses",
        options: [
          { label: "Active", value: "true" },
          { label: "Inactive", value: "false" },
        ],
      },
    }),
    [vehicleTypes, countries]
  );

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
