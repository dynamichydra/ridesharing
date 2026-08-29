import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, ArrowUpRight } from "lucide-react";
import type { RecentActivityItem } from "../types";

interface RecentActivityCardProps {
  items?: RecentActivityItem[];
  isLoading?: boolean;
}

export function RecentActivityCard({ items = [] }: RecentActivityCardProps) {
  return (
    <Card className="border-border bg-card shadow-sm flex flex-col h-full">
      <CardHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Recent Activity
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs text-primary hover:text-primary hover:bg-primary/10 h-7"
        >
          <Link to="/rides" className="flex items-center gap-1">
            View All
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <tbody>
            {items.map((row) => {
              const isProgress = row.status === "started" || row.status === "arriving" || row.status === "accepted";
              const isCompleted = row.status === "completed";
              const isCancelled = row.status === "cancelled";

              const riderInitials = (row.riderName || "R")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <tr
                  key={row.id}
                  className={`border-b border-border/50 hover:bg-muted/40 transition-colors last:border-0 ${
                    isProgress ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="p-3 pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 text-xs font-semibold bg-muted text-muted-foreground">
                        <AvatarFallback>{riderInitials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {row.riderName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {row.vehicleTypeName} • {row.timeAgo}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-right pr-4 shrink-0">
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        Completed
                      </span>
                    )}
                    {isProgress && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-primary/10 text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        In Progress
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-destructive/10 text-destructive">
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        Canceled
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
