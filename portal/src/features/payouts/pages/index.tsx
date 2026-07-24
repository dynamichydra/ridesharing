import { useState } from "react";
import { Banknote, ShieldCheck, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import PayoutAccountsTab from "./payout-accounts";
import PayoutRunsTab from "./payout-runs";

const TABS = [
  { key: "accounts", label: "Payout Accounts", icon: ShieldCheck },
  { key: "runs", label: "Payout Runs", icon: PlayCircle },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PayoutList() {
  const [activeTab, setActiveTab] = useState<TabKey>("accounts");

  return (
    <div className="w-full flex-col flex gap-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Banknote className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Driver Payouts
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

      {activeTab === "accounts" && <PayoutAccountsTab />}
      {activeTab === "runs" && <PayoutRunsTab />}
    </div>
  );
}
