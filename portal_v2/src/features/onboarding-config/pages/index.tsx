import { useState } from "react";
import { ClipboardList, FileCheck2, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentTypesTab from "./document-types";
import QuestionsTab from "./questions";
import LegalTab from "./legal";

const TABS = [
  { key: "document-types", label: "Document Types", icon: FileCheck2 },
  { key: "questions", label: "Questionnaire", icon: ClipboardList },
  { key: "legal", label: "Legal Documents", icon: Scale },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OnboardingConfigList() {
  const [activeTab, setActiveTab] = useState<TabKey>("document-types");

  return (
    <div className="w-full flex-col p-3 md:p-6 flex gap-4">
      <div className="flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-10 py-2 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground uppercase">
            Driver Onboarding Config
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

      {activeTab === "document-types" && <DocumentTypesTab />}
      {activeTab === "questions" && <QuestionsTab />}
      {activeTab === "legal" && <LegalTab />}
    </div>
  );
}
