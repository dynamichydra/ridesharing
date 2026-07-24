import { useState } from "react";
import { Scale, ListChecks, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFilterController } from "@/components/filters/useFilterController";
import RunsTab from "./runs";
import MismatchesTab from "./mismatches";
import type { ReconciliationRun } from "../types";

const TABS = [
  { key: "runs", label: "Runs", icon: ListChecks },
  { key: "mismatches", label: "Mismatches", icon: AlertTriangle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReconciliationList() {
  const [activeTab, setActiveTab] = useState<TabKey>("runs");
  // Not rendered — used only to push the runId param into the shared URL so MismatchesTab's
  // own controller picks it up when "View mismatches" is clicked from the Runs tab.
  const urlController = useFilterController();

  const handleViewMismatches = (run: ReconciliationRun) => {
    urlController.apply({ runId: run.id, page: 1 });
    setActiveTab("mismatches");
  };

  return (
    <div className="w-full flex-col flex gap-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Scale className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Reconciliation
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer",
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "runs" && <RunsTab onViewMismatches={handleViewMismatches} />}
      {activeTab === "mismatches" && <MismatchesTab />}
    </div>
  );
}
