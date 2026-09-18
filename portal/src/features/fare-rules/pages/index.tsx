import { useState } from "react";
import { DollarSign, Percent, Split, Plane, Moon, Zap, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import FareRuleList from "./list";
import TaxRulesTab from "./tax-rules";
import CommissionRulesTab from "./commission-rules";
import AirportRulesTab from "./airport-rules";
import NightPeakRulesTab from "./night-peak-rules";
import SurgeTollRulesTab from "./surge-toll-rules";
import FareSimulatorTab from "./fare-simulator";

const TABS = [
  { key: "fare-rules", label: "Fare Rules", icon: DollarSign },
  { key: "simulator", label: "Fare Simulator & Quotes", icon: Calculator },
  { key: "airports", label: "Airports & Rules", icon: Plane },
  { key: "night-peak", label: "Night & Peak Rules", icon: Moon },
  { key: "surge-toll", label: "Surge & Tolls", icon: Zap },
  { key: "tax-rules", label: "Tax Rules", icon: Percent },
  { key: "commission-rules", label: "Commission Rules", icon: Split },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function FareRulesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("fare-rules");

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

      {activeTab === "fare-rules" && <FareRuleList />}
      {activeTab === "simulator" && <FareSimulatorTab />}
      {activeTab === "airports" && <AirportRulesTab />}
      {activeTab === "night-peak" && <NightPeakRulesTab />}
      {activeTab === "surge-toll" && <SurgeTollRulesTab />}
      {activeTab === "tax-rules" && <TaxRulesTab />}
      {activeTab === "commission-rules" && <CommissionRulesTab />}
    </div>
  );
}

