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
  Wallet,
  WalletCards,
  Undo2,
  Banknote,
  ShieldAlert,
  Scale,
  BookText,
  AlertOctagon,
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
    title: "Ride Payments",
    url: "/ride-payments",
    icon: Wallet,
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
    title: "Rider Plans",
    url: "/rider-plans",
    icon: CreditCard,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Wallets",
    url: "/wallets",
    icon: WalletCards,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Refunds",
    url: "/refunds",
    icon: Undo2,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Driver Payouts",
    url: "/payouts",
    icon: Banknote,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Disputes",
    url: "/disputes",
    icon: ShieldAlert,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Reconciliation",
    url: "/reconciliation",
    icon: Scale,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Ledger",
    url: "/ledger",
    icon: BookText,
    isActive: true,
    type: "regular",
    roles: ["super_admin"],
  },
  {
    title: "Flagged Trips",
    url: "/flagged-trips",
    icon: AlertOctagon,
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
