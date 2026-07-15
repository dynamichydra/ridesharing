import { Card, CardContent } from "@/components/ui/card";
import FareRuleList from "./list";

export default function FareRuleListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Fare Rules</h2>
        <p className="text-muted-foreground mt-1">
          Configure surge multipliers based on time, zone, or traffic conditions.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardContent>
          <FareRuleList />
        </CardContent>
      </Card>
    </div>
  );
}
