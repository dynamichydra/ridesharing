import { ModeToggle } from "@/components/mode-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LogOut as logoutApi } from "@/features/auth/api";
import { BadgeCheck, User, LogOut, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { memo } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useUser } from "@/hooks/use-user";

const header = memo(() => {
  const { user } = useUser();
  const navigate = useNavigate();
  console.log("Re-Render");

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear w-full group-has-data-[collapsible=icon]/sidebar-wrapper:h-16 bg-sidebar fixed md:w-[calc(100%-var(--sidebar-width))] z-50 group-has-data-[collapsible=icon]/sidebar-wrapper:w-[calc(100%-var(--sidebar-width-icon))]">
      <div className="flex items-center gap-2 px-4 w-full">
        <SidebarTrigger variant={"outline"} />
        <h1 className="text-sm md:text-xl font-bold">
          Welcome back, <span className="capitalize">{user?.name}</span> 👋
        </h1>
        <div className="ml-auto flex justify-center items-center gap-3">
          <ModeToggle />
          <Separator
            orientation="vertical"
            className="data-[orientation=vertical]:h-6"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size={"icon"}>
                <User />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={"bottom"} align="end" sideOffset={14}>
              <DropdownMenuItem>
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-full bg-primary">
                      {user?.email.split("")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("user/profile")}>
                <BadgeCheck />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`user/reset-password/${user?.id}`)}>
                <Lock />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logoutApi}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

export default header;
