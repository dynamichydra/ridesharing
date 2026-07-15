import React from "react";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import { Loader2, Search, RotateCcw } from "lucide-react";
import { SearchList } from "@/components/Search";
import { cn } from "@/lib/utils";

export type FilterSchema = {
  [key: string]: {
    label: string;
    operator: string;
    type?: "text" | "number" | "select" | "searchList" | "date";
    options?:
      | { label: string; value: any }[]
      | readonly { label: string; value: any }[];
    placeholder?: string;
    field?: string; // The actual DB field name (if different from key)
    defaultValue?: any; // Default value for this filter
  };
};

export function getDefaultsFromSchema(schema: FilterSchema) {
  const defaults: Record<string, any> = {};
  Object.entries(schema).forEach(([key, cfg]) => {
    if (cfg.defaultValue !== undefined) {
      const fieldName = cfg.field || key;
      const paramKey =
        cfg.operator === "equals"
          ? fieldName
          : `${fieldName}[${cfg.operator}]`;
      defaults[paramKey] = cfg.defaultValue;
    }
  });
  return defaults;
}

export function AutoFilters({
  schema,
  controller,
  isFetching = false,
  actions,
  className,
  compact = false,
}: {
  schema: FilterSchema;
  controller: any;
  isFetching?: boolean;
  actions?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  const { draft, setDraftValue, apply, reset } = controller;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      apply();
    }
  };

  return (
    <div 
      onKeyDown={onKeyDown} 
      className={cn(
        "bg-card rounded-lg border shadow-sm transition-all duration-200",
        compact ? "p-2" : "p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
        {/* Filter Inputs in the same row */}
        {Object.entries(schema).map(([key, cfg]) => {
          const fieldName = cfg.field || key;
          const paramKey =
            cfg.operator === "equals" 
              ? fieldName 
              : `${fieldName}[${cfg.operator}]`;

          const value = draft[paramKey] ?? "";
          const sharedPlaceholder = cfg.placeholder ?? cfg.label;

          return (
            <div key={key} className="w-[180px]">
              <div className="relative group w-full">
                {cfg.type === "select" ? (
                  <NativeSelect
                    id={cfg.label}
                    value={value || "none"}
                    onChange={(e) => setDraftValue(paramKey, e.target.value)}
                    className={cn(
                      "w-full bg-background/50 hover:bg-background transition-colors ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/20",
                      compact ? "h-8 text-xs" : "h-9 text-sm"
                    )}
                  >
                    <NativeSelectOption value="none">All {cfg.label}</NativeSelectOption>
                    {cfg.options?.map((o) => (
                      <NativeSelectOption key={o.value} value={o.value}>
                        {o.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                ) : cfg.type === "searchList" ? (
                  <div className="w-full">
                    <SearchList
                      lists={(cfg.options as any[]) || []}
                      placeholder={compact ? cfg.label : `Select ${cfg.label}`}
                      value={value}
                      className={cn(
                        "bg-background/50 hover:bg-background transition-colors",
                        compact ? "h-8 text-xs px-3" : "h-9 text-sm px-3"
                      )}
                      setValue={(val) => {
                        const newValue = typeof val === 'function' ? val(value) : val;
                        setDraftValue(paramKey, newValue);
                      }}
                    />
                  </div>
                ) : (
                  <Input
                    type={cfg.type ?? "text"}
                    value={value}
                    placeholder={sharedPlaceholder}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftValue(paramKey, e.target.value)}
                    className={cn(
                      "w-full bg-background/50 focus:bg-background transition-all ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/20",
                      compact ? "h-8 text-xs placeholder:text-[10px]" : "h-9 text-sm"
                    )}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Button Group for Search & Reset */}
        <div className="flex items-center shrink-0">
          <Button 
            onClick={() => apply()} 
            disabled={isFetching} 
            size={compact ? "sm" : "default"}
            variant={"outline"}
            className={cn(
              "rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold",
              compact && "h-8 px-3"
            )}
          >
            {isFetching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
            <span className="font-medium">Search</span>
          </Button>
          <Button
            onClick={() => reset()}
            variant="outline"
            disabled={isFetching}
            size={compact ? "sm" : "default"}
            className={cn(
              "rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground",
              compact && "h-8"
            )}
            title="Reset Filters"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>

        {/* External Actions */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 ml-auto border-l pl-2 border-border/50">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
