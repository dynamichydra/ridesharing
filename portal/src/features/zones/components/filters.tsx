import React from "react";
import { AutoFilters } from "@/components/filters/AutoFilters";
import type { FilterSchema } from "@/components/filters/AutoFilters";
import type { useFilterController } from "@/components/filters/useFilterController";
import { useCountries } from "../hooks";

interface ZoneFiltersProps {
  controller: ReturnType<typeof useFilterController>;
  isFetching?: boolean;
}

export function ZoneFilters({ controller, isFetching }: ZoneFiltersProps) {
  const { data: countriesData } = useCountries();
  const countries = countriesData?.MESSAGE ?? [];


  const schema: FilterSchema = React.useMemo(() => ({
    countryId: {
      label: "Country",
      operator: "equals",
      type: "select",
      options: countries.map((c) => ({ label: c.name, value: c.id })),
    },
  }), [countries]);

  return (
    <AutoFilters 
      schema={schema} 
      controller={controller} 
      isFetching={isFetching} 
    />
  );
}