import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SubscriptionPlanList from "./list";

export default function SubscriptionPlanListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Driver Subscriptions</h2>
        <p className="text-muted-foreground mt-1">
          Configure subscription packages, prices, and limits allowed for partner accounts.
        </p>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Driver Onboarding Plans</CardTitle>
          <CardDescription>
            Configure packages driver partners must buy to match passenger dispatches.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SubscriptionPlanList />
        </CardContent>
      </Card>
    </div>
  );
}
