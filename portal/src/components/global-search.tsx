import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Search, ShieldCheck, User } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useUser } from "@/hooks/use-user";
import { navItem } from "@/config/navConfig";
import { useSearchRiders } from "@/features/users/hooks";
import { useSearchDrivers } from "@/features/drivers/hooks";

export function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const { data: riderResults, isFetching: ridersLoading } = useSearchRiders(debouncedQuery, open);
  const { data: driverResults, isFetching: driversLoading } = useSearchDrivers(debouncedQuery, open);

  const riders = riderResults?.MESSAGE || [];
  const drivers = driverResults?.MESSAGE || [];

  const navItems = navItem.filter((nav) => !nav.roles || (user && nav.roles.includes(user.role)));

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-9 w-full max-w-xs justify-between text-muted-foreground font-normal cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search...
        </span>
        <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Global Search"
        description="Search riders, drivers, and jump to any page"
      >
      <CommandInput
        placeholder="Search riders, drivers, or type a page name..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!(ridersLoading || driversLoading) && <CommandEmpty>No results found.</CommandEmpty>}

        <CommandGroup heading="Pages">
          {navItems.map((nav) => (
            <CommandItem key={nav.url} value={nav.title} onSelect={() => goTo(nav.url)}>
              <LayoutDashboard className="h-4 w-4" />
              {nav.title}
            </CommandItem>
          ))}
        </CommandGroup>

        {riders.length > 0 && (
          <CommandGroup heading="Riders">
            {riders.map((r) => (
              <CommandItem
                key={r.id}
                value={`rider-${r.id}-${r.name}-${r.phone}`}
                onSelect={() => goTo(`/users?search=${encodeURIComponent(r.phone)}`)}
              >
                <User className="h-4 w-4" />
                <span>{r.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{r.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {drivers.length > 0 && (
          <CommandGroup heading="Drivers">
            {drivers.map((d) => (
              <CommandItem
                key={d.id}
                value={`driver-${d.id}-${d.name}-${d.phone}`}
                onSelect={() => goTo(`/drivers/${d.id}`)}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>{d.name || "Unnamed Driver"}</span>
                <span className="ml-auto text-xs text-muted-foreground">{d.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      </CommandDialog>
    </>
  );
}
