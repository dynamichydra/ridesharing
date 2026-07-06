import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";
import Header from "./header";
import { useIdleTimer } from "react-idle-timer";
import { LogOut } from "@/features/auth/api";

export function dashboard() {
  useIdleTimer({
    timeout: 1000 * 60 * 60, // 1 hour
    onIdle: LogOut,
    crossTab: true, // synchronize logout between tabs
    leaderElection: true,
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 bg-secondary mt-16">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
