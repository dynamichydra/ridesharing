import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { fareRuleSchema, type FareRuleFormValues } from "../schema";
import type { LookupOption } from "../types";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

interface FareRuleFormProps {
  defaultValues: FareRuleFormValues;
  onSubmit: (values: FareRuleFormValues) => void;
  onCancel: () => void;
  submitLabel: string;
  isPending: boolean;
  countries: LookupOption[];
  vehicleTypes: LookupOption[];
  zones: LookupOption[];
}

export default function FareRuleForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  isPending,
  countries,
  vehicleTypes,
  zones,
}: FareRuleFormProps) {
  const form = useForm<FareRuleFormValues>({
    resolver: zodResolver(fareRuleSchema),
    defaultValues,
  });


  useEffect(() => {
    form.reset(defaultValues);
  }, [defaultValues, form]);

  const ruleType = form.watch("ruleType");
  const daysOfWeek = form.watch("daysOfWeek") || [];

  const toggleDay = (day: number) => {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    form.setValue("daysOfWeek", next, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Rule Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Late Night Surge" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ruleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Rule Type <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="time">Time-based</option>
                    <option value="traffic">Traffic-based</option>
                    <option value="zone">Zone-based</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="countryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Country <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="multiplier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Multiplier <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" placeholder="e.g. 1.5" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Priority <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" step="1" placeholder="e.g. 1" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vehicleTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Vehicle Type <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="">Select type</option>
                    {vehicleTypes.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

      
        {ruleType === "time" && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Start Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      End Time <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2">
              <FormLabel>
                Days of Week <span className="text-red-500">*</span>
              </FormLabel>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors ${
                      daysOfWeek.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {form.formState.errors.daysOfWeek && "message" in form.formState.errors.daysOfWeek && (
                <p className="text-xs font-medium text-destructive">
                  {form.formState.errors.daysOfWeek.message}
                </p>
              )}
            </div>
          </>
        )}

        {ruleType === "traffic" && (
          <FormField
            control={form.control}
            name="trafficDelayS"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Traffic Delay (seconds) <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input type="number" step="1" min="0" placeholder="e.g. 300" {...field} onChange={(e) => field.onChange(e.target.valueAsNumber)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {ruleType === "zone" && (
          <FormField
            control={form.control}
            name="zoneId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Zone <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full bg-card text-foreground border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                  >
                    <option value="">Select zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <input
                  type="checkbox"
                  checked={field.value ?? true}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border cursor-pointer"
                />
              </FormControl>
              <FormLabel className="cursor-pointer !mt-0">Active</FormLabel>
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            disabled={isPending}
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
