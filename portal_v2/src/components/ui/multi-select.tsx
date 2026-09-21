import * as React from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandInput, CommandList, CommandEmpty } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  onSearch?: (value: string) => void;
  isLoading?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  disabled = false,
  onSearch,
  isLoading = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Normalize values to strings to ensuring comparison safety
  const safeValue = (value || []).map(v => String(v));

  const toggleOption = (val: string) => {
    const valStr = String(val);
    if (safeValue.includes(valStr)) {
      onChange(safeValue.filter((v) => v !== valStr));
    } else {
      onChange([...safeValue, valStr]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between min-h-[44px] h-auto p-2",
          )}
        >
          <div className="flex flex-wrap gap-1 items-center overflow-hidden">
            {safeValue.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {safeValue.map((val) => {
              const option = options.find((o) => o.value === val);
              const label = option?.label ?? val;
              return (
                <Badge
                  key={val}
                  variant="secondary"
                  className="flex items-center gap-1 truncate max-w-[200px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(val);
                  }}
                >
                    <span className="truncate">{label}</span>
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" />
                </Badge>
              );
            })}
          </div>
          <div className="flex items-center gap-2 ml-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={!onSearch}>
          <CommandInput placeholder="Search..." onValueChange={onSearch} />
          <CommandList>
            {isLoading ? (
              <div className="p-4 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground mt-2">Loading...</p>
              </div>
            ) : (
              <>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup className="max-h-[300px] overflow-auto">
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      onSelect={() => toggleOption(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          safeValue.includes(option.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
