import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Combobox = {
  lists?: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
  emptyMessage?: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  value: string | undefined;
  className?: string;
};

export function SearchList({
  lists,
  emptyMessage = "No result found",
  placeholder = "Search",
  setValue,
  value,
  className,
}: Combobox) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredLists =
    lists?.filter((list) =>
      list.label.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between overflow-hidden", className)}
        >
          <span className="truncate mr-2">
            {value
              ? lists?.find((list) => list.value === value)?.label
              : placeholder}
          </span>
          <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            className="h-9"
            onValueChange={setSearchTerm}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {filteredLists.map((list) => (
                <CommandItem
                  key={list.value}
                  value={list.label}
                  onSelect={(currentLabel) => {
                    const selected = lists?.find(
                      (item) => item.label === currentLabel
                    );
                    if (selected?.value === value) {
                      setValue("");
                    } else {
                      setValue(selected?.value || "");
                    }
                    setOpen(false);
                  }}
                >
                  {list.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === list.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
