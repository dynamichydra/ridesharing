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

function formatDisplayTimeAgo(timeAgoStr?: string, requestedAt?: string | Date): string {
  if (timeAgoStr === "Active" || timeAgoStr === "Just now") {
    return timeAgoStr;
  }

  // If requestedAt is present, compute precise human-readable time ago
  if (requestedAt) {
    const diffMs = Date.now() - new Date(requestedAt).getTime();
    if (!isNaN(diffMs) && diffMs >= 0) {
      const totalMin = Math.floor(diffMs / 60000);
      if (totalMin < 1) return "Just now";
      if (totalMin < 60) return `${totalMin} ${totalMin === 1 ? "min" : "mins"} ago`;

      const totalHours = Math.floor(totalMin / 60);
      const remainingMins = totalMin % 60;

      if (totalHours < 24) {
        if (remainingMins === 0) {
          return `${totalHours} ${totalHours === 1 ? "hr" : "hrs"} ago`;
        }
        return `${totalHours} ${totalHours === 1 ? "hr" : "hrs"} ${remainingMins} min ago`;
      }

      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      if (days < 7) {
        if (remainingHours === 0) {
          return `${days} ${days === 1 ? "day" : "days"} ago`;
        }
        return `${days} ${days === 1 ? "day" : "days"} ${remainingHours} hr ago`;
      }

      const weeks = Math.floor(days / 7);
      return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
    }
  }

  // Fallback parsing if only string like "123 mins ago" is given
  if (timeAgoStr) {
    const match = timeAgoStr.match(/^(\d+)\s*mins?\s*ago$/i);
    if (match) {
      const totalMin = parseInt(match[1], 10);
      if (totalMin < 60) return `${totalMin} mins ago`;
      const hours = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      if (hours < 24) {
        return mins > 0 ? `${hours} hr ${mins} min ago` : `${hours} hrs ago`;
      }
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return remHours > 0 ? `${days} day ${remHours} hr ago` : `${days} days ago`;
    }
    return timeAgoStr;
  }

  return "Just now";
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
              const displayTime = isProgress ? "Active" : formatDisplayTimeAgo(row.timeAgo, row.requestedAt);

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
                          {row.vehicleTypeName} • {displayTime}
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
