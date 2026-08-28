import { useState } from "react";
import { Globe, Landmark, Building2, Layers, MapPin, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import CountriesTab from "./countries";
import StatesTab from "./states";
import CitiesTab from "./cities";
import CityTypesTab from "./city-types";
import ServiceAreasTab from "./service-areas";
import CurrenciesTab from "./currencies";

const TABS = [
  { key: "countries", label: "Countries", icon: Globe },
  { key: "currencies", label: "Currencies", icon: Coins },
  { key: "states", label: "States", icon: Landmark },
  { key: "cities", label: "Cities", icon: Building2 },
  { key: "city-types", label: "City Types / Tiers", icon: Layers },
  { key: "service-areas", label: "Service Areas", icon: MapPin },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function GeoList() {
  const [activeTab, setActiveTab] = useState<TabKey>("countries");

  return (
    <div className="w-full flex-col p-3 md:p-6 flex gap-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Locations, Boundaries & Currencies
          </h2>
        </div>
      </div>

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

      {activeTab === "countries" && <CountriesTab />}
      {activeTab === "currencies" && <CurrenciesTab />}
      {activeTab === "states" && <StatesTab />}
      {activeTab === "cities" && <CitiesTab />}
      {activeTab === "city-types" && <CityTypesTab />}
      {activeTab === "service-areas" && <ServiceAreasTab />}
    </div>
  );
}


