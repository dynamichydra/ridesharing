import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rideFilterSchema, rideStatusOptions } from "../schema";
import type { RideFilterValues } from "../schema";

interface RideFilterFormProps {
  defaultValues: RideFilterValues;
  onApply: (values: RideFilterValues) => void;
  onReset: () => void;
}

export function RideFilterForm({ defaultValues, onApply, onReset }: RideFilterFormProps) {
  const { register, handleSubmit, reset } = useForm<RideFilterValues>({
    resolver: zodResolver(rideFilterSchema),
    defaultValues,
  });

  const submit = handleSubmit((values) => {
    onApply(values);
  });

  const handleReset = () => {
    reset({ status: "" });
    onReset();
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3 w-full">
      <select
        {...register("status")}
        className="bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
      >
        <option value="">All Statuses</option>
        {rideStatusOptions.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>
      <div className="flex items-center shrink-0">
        <Button
          type="button"
          onClick={submit}
          variant="outline"
          className="rounded-r-none border-r-0 h-9 gap-2 shadow-sm font-semibold cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="font-medium">Search</span>
        </Button>
        <Button
          type="button"
          onClick={handleReset}
          variant="outline"
          className="rounded-l-none h-9 px-3 hover:bg-accent/50 text-muted-foreground cursor-pointer"
          title="Reset Filters"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
