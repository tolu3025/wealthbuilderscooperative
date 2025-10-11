import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowDownLeft, 
  TrendingUp,
  UserPlus,
  HelpCircle,
  User,
  FileText
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
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contributions", url: "/contribute", icon: Wallet },
  { title: "Withdrawals", url: "/withdraw", icon: ArrowDownLeft },
  { title: "Dividends", url: "/member/dividends", icon: TrendingUp },
  { title: "Referrals", url: "/member/referrals", icon: UserPlus },
  { title: "Blog", url: "/blog", icon: FileText },
  { title: "Profile", url: "/member/profile", icon: User },
  { title: "Support", url: "/contact", icon: HelpCircle },
];

export function MemberSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "px-2" : ""}>
            {!collapsed && "Member Menu"}
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
