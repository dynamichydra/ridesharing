import { Loader2 } from "lucide-react";

export default function FullPageLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background text-foreground">
      <Loader2 className="h-12 w-12 animate-spin mb-4 text-primary" />
      <p className="text-lg font-medium text-primary">Loading…</p>
    </div>
  );
}
