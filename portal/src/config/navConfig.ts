import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Car,
  CarFront,
  Map,
  Globe,
  DollarSign,
  CreditCard,
  ScrollText,
  ClipboardList,
  type LucideIcon
} from "lucide-react";

export type NavType = {
  title: string;
  roles?: string[];
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  type: 'dropdown' | 'regular';
  items?: {
    title: string;
    url: string;
    roles?: string[];
  }[];
};

export const navItem: NavType[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
    type: "regular",
  },
  {
    title: "Users",
    url: "/users",
    icon: Users,
    isActive: true,
    type: "regular",
  },
  {
    title: "Drivers Approval",
    url: "/drivers",
    icon: ShieldCheck,
    isActive: true,
    type: "regular",
  },
  {
    title: "Rides Management",
    url: "/rides",
    icon: Car,
    isActive: true,
    type: "regular",
  },
  {
    title: "Vehicle Types",
    url: "/vehicle-types",
    icon: CarFront,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Zones Geofence",
    url: "/zones",
    icon: Map,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Locations",
    url: "/locations",
    icon: Globe,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Fare Rules",
    url: "/fare-rules",
    icon: DollarSign,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Subscription Plans",
    url: "/subscription-plans",
    icon: CreditCard,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Audit Log",
    url: "/audit-logs",
    icon: ScrollText,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Onboarding Config",
    url: "/onboarding-config",
    icon: ClipboardList,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
];
