import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RiderFiltersProps {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onSearch: () => void;
  onReset: () => void;
  actions?: React.ReactNode;
}

export function RiderFilters({
  searchDraft,
  onSearchDraftChange,
  onSearch,
  onReset,
  actions,
}: RiderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
      <div className="flex flex-wrap items-center gap-3 flex-1">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search by name, email or phone..."
            value={searchDraft}
            onChange={(e) => onSearchDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            className="pl-9"
          />
        </div>

        <div className="flex items-center shrink-0">
          <Button
            onClick={onSearch}
            variant="outline"
            className="rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-medium">Search</span>
          </Button>

          <Button
            onClick={onReset}
            variant="outline"
            className="rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground cursor-pointer"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}