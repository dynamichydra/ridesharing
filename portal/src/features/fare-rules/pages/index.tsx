import { useState } from "react";
import { DollarSign, Percent, Split } from "lucide-react";
import { cn } from "@/lib/utils";
import FareRuleList from "./list";
import TaxRulesTab from "./tax-rules";
import CommissionRulesTab from "./commission-rules";

const TABS = [
  { key: "fare-rules", label: "Fare Rules", icon: DollarSign },
  { key: "tax-rules", label: "Tax Rules", icon: Percent },
  { key: "commission-rules", label: "Commission Rules", icon: Split },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function FareRulesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("fare-rules");

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

      {activeTab === "fare-rules" && <FareRuleList />}
      {activeTab === "tax-rules" && <TaxRulesTab />}
      {activeTab === "commission-rules" && <CommissionRulesTab />}
    </div>
  );
}
