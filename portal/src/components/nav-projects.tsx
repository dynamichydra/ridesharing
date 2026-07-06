import { type LucideIcon } from "lucide-react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

export function NavProjects({
  projects,
}: {
  projects: {
    title: string;
    url: string;
    icon?: LucideIcon;
  };
}) {


    const { toggleSidebar } = useSidebar();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mobCollapseSidebar = () => {
    if (isMobile) {
      toggleSidebar();

      console.log("21");
      
    }
  };


  return (
    <SidebarMenu>
      <SidebarMenuItem key={projects.title}>
        <SidebarMenuButton
          asChild
          // isActive={useMatch(projects.url) ? true : false}
          
        >
          <NavLink to={projects.url} onClick={mobCollapseSidebar}>
            { projects.icon && <projects.icon />}
            <span>{projects.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
