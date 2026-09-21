import * as React from "react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
    logo: React.ComponentType<{ className?: string }> | string;
    plan: string;
  };
}) {
  const Logo = teams.logo;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-background text-primary-foreground overflow-hidden border border-border/50 p-1">
            {typeof Logo === "string" ? (
              <img src={Logo} alt={teams.name} className="size-full object-contain" />
            ) : (
              React.createElement(Logo, { className: "size-4" })
            )}
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold text-primary">
              {teams.name}
            </span>
            <span className="truncate text-xs text-muted-foreground">{teams.plan}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
