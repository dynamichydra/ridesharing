import * as React from "react";
import { LogOut } from "lucide-react";
import { NavProjects } from "@/components/nav-projects";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TeamSwitcher } from "./team-switcher";
import { LogOut as logOutApi } from "@/features/auth/api";
import { navItem } from "@/config/navConfig";
import { NavMain } from "./nav-main";
import { useUser } from "@/hooks/use-user";

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

export function AppSidebar({ ...props }: AppSidebarProps) {
  const { user } = useUser();
  const visibleNavItems = navItem.filter(
    (nav) => !nav.roles || (user && nav.roles.includes(user.role)),
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          teams={{
            name: "Ryva Ride",
            logo: "/logo.png",
            plan: "Admin Panel",
          }}
        />
      </SidebarHeader>
      <SidebarContent>
        {visibleNavItems.map((nav) => {
          if (nav.type === "dropdown") {
            return <NavMain items={nav} key={nav.title} />;
          } else {
            return <NavProjects projects={nav} key={nav.title} />;
          }
        })}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-3 text-primary cursor-pointer hover:bg-primary/10"
              onClick={logOutApi}
            >
              <Avatar className="size-5 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/20 text-primary">
                  <LogOut className="size-4" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
