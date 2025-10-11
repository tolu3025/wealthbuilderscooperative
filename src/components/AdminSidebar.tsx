import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  UserCheck, 
  Wallet, 
  TrendingUp,
  ArrowDownLeft,
  DollarSign,
  FileText,
  BarChart3,
  Settings
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Registrations", url: "/admin/registrations", icon: UserCheck },
  { title: "Contributions", url: "/admin/contributions", icon: Wallet },
  { title: "Dividends", url: "/admin/dividends", icon: TrendingUp },
  { title: "Withdrawals", url: "/admin/withdrawals", icon: ArrowDownLeft },
  { title: "Commissions", url: "/admin/commissions", icon: DollarSign },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Blog", url: "/admin/blog", icon: FileText },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "px-2" : ""}>
            {!collapsed && "Admin Menu"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
