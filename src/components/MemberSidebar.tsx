import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowDownLeft, 
  TrendingUp,
  UserPlus,
  HelpCircle,
  User,
  FileText,
  Briefcase,
  MapPin,
  Building2
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
import { supabase } from "@/integrations/supabase/client";

const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contributions", url: "/contribute", icon: Wallet },
  { title: "Withdrawals", url: "/withdraw", icon: ArrowDownLeft },
  { title: "Dividends", url: "/member/dividends", icon: TrendingUp },
  { title: "Property Plans", url: "/member/property-plans", icon: Building2 },
  { title: "My Invites", url: "/member/referrals", icon: UserPlus },
  { title: "Blog", url: "/blog", icon: FileText },
  { title: "Profile", url: "/member/profile", icon: User },
  { title: "Support", url: "/contact", icon: HelpCircle },
];

export function MemberSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const [menuItems, setMenuItems] = useState(baseMenuItems);

  useEffect(() => {
    const fetchUserRoles = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!roles) return;

      const userRoles = roles.map(r => r.role as string);
      const additionalItems = [];

      if (userRoles.includes("state_rep")) {
        additionalItems.push({
          title: "State Rep Dashboard",
          url: "/state-rep",
          icon: MapPin
        });
      }

      if (userRoles.includes("director")) {
        additionalItems.push({
          title: "Director Dashboard",
          url: "/director",
          icon: Briefcase
        });
      }

      if (additionalItems.length > 0) {
        setMenuItems([...baseMenuItems, ...additionalItems]);
      }
    };

    fetchUserRoles();
  }, []);

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
