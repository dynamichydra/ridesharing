import { useState } from "react";
import { ScrollText, History } from "lucide-react";
import { cn } from "@/lib/utils";
import AuditLogList from "./list";
import RideHistoryTab from "./ride-history";

const TABS = [
  { key: "audit-log", label: "Audit Log", icon: ScrollText },
  { key: "ride-history", label: "Ride History", icon: History },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AuditLogsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("audit-log");

  return (
    <div className="w-full flex-col flex gap-4">
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

      {activeTab === "audit-log" && <AuditLogList />}
      {activeTab === "ride-history" && <RideHistoryTab />}
    </div>
  );
}
