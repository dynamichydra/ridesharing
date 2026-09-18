import { useState } from "react";
import { TicketPercent, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import PromoList from "./list";
import PromoUsagesTab from "./usages";

const TABS = [
  { key: "promos", label: "Promos & Coupons", icon: TicketPercent },
  { key: "usages", label: "Redemptions & Subsidies Audit", icon: ShieldCheck },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PromosPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("promos");

  return (
    <div className="w-full flex-col flex gap-4">
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer whitespace-nowrap",
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

      {activeTab === "promos" && <PromoList />}
      {activeTab === "usages" && <PromoUsagesTab />}
    </div>
  );
}
