import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DialogFooter } from "@/components/ui/dialog";
import { useCreateZone, useUpdateZone } from "../hooks";
import { zoneFormSchema, type ZoneFormValues } from "../schema";
import type { Zone } from "../types";

interface ZoneFormProps {
  initialData?: Zone | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const EMPTY: ZoneFormValues = {
  name: "",
  type: "city",
  multiplier: "1.00",
  description: "",
  polygonText: "",
  isActive: true,
};


export default function ZoneForm({ initialData, onSuccess, onCancel }: ZoneFormProps) {
  const createMutation = useCreateZone();
  const updateMutation = useUpdateZone();

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        type: initialData.type,
        multiplier: initialData.multiplier,
        description: initialData.description ?? "",
        polygonText: JSON.stringify(initialData.polygon, null, 2),
        isActive: initialData.isActive,
      });
    } else {
      form.reset(EMPTY);
    }
  }, [initialData, form]);

  const onSubmit = async (values: ZoneFormValues) => {
    const polygon = JSON.parse(values.polygonText);
    const payload = {
      name: values.name,
      type: values.type,
      polygon,
      multiplier: values.multiplier || undefined,
      description: values.description || undefined,
      isActive: values.isActive,
    };

    try {
      if (initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
        form.reset(EMPTY);
      }
      onSuccess();
    } catch (error) {
      console.error("Zone form error:", error);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-3">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>
                Zone Name <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g. Kolkata City Centre" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>
                  Zone Type <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g. city, airport, suburb" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="multiplier"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Multiplier</FormLabel>
                <FormControl>
                  <Input placeholder="1.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="e.g. Central Kolkata – Park Street, BBD Bagh, Esplanade"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="polygonText"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>
                Polygon (GeoJSON) <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{ "type": "Polygon", "coordinates": [[[88.34,22.55],[88.38,22.55],[88.38,22.59],[88.34,22.55]]] }'
                  rows={5}
                  className="font-mono text-xs"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <input
            id="zone-active"
            type="checkbox"
            checked={form.watch("isActive") ?? true}
            onChange={(e) => form.setValue("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-border cursor-pointer"
          />
          <FormLabel htmlFor="zone-active" className="cursor-pointer font-normal">
            Active
          </FormLabel>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-white cursor-pointer"
          >
            {isLoading ? "Saving..." : initialData ? "Save Changes" : "Create Zone"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}