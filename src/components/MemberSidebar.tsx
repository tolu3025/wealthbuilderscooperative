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
  Building2,
  Lock,
  Menu,
  X,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
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
import { useIsMobile } from "@/hooks/use-mobile";

const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Project Support (₦500)", url: "/member/project-support", icon: Heart, highlight: true },
  { title: "Contributions", url: "/contribute", icon: Wallet },
  { title: "Withdrawals", url: "/withdraw", icon: ArrowDownLeft },
  { title: "Dividends", url: "/member/dividends", icon: TrendingUp },
  { title: "Investment Plans", url: "/member/property-plans", icon: Building2 },
  { title: "My Invites", url: "/member/referrals", icon: UserPlus },
  { title: "Blog", url: "/blog", icon: FileText },
  { title: "Profile", url: "/member/profile", icon: User },
  { title: "Change Password", url: "/member/change-password", icon: Lock },
  { title: "Support", url: "/contact", icon: HelpCircle },
];

export function MemberSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const [menuItems, setMenuItems] = useState(baseMenuItems);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

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

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const MenuContent = () => (
    <div className="py-4">
      <div className="px-4 mb-4">
        <h2 className="text-lg font-semibold text-primary">Member Menu</h2>
      </div>
      <nav className="space-y-1 px-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
              isActive(item.url)
                ? "bg-primary text-primary-foreground"
                : (item as any).highlight
                ? "bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-100 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800"
                : "hover:bg-muted"
            }`}
          >
            <item.icon className={`h-5 w-5 ${(item as any).highlight && !isActive(item.url) ? 'text-red-600' : ''}`} />
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );

  // Mobile: Show hamburger menu
  if (isMobile) {
    return (
      <>
        {/* Fixed hamburger button */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <MenuContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Show regular sidebar
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
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    className={(item as any).highlight && !isActive(item.url) ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800" : ""}
                  >
                    <NavLink to={item.url}>
                      <item.icon className={`h-4 w-4 ${(item as any).highlight && !isActive(item.url) ? 'text-red-600' : ''}`} />
                      {!collapsed && <span className={(item as any).highlight && !isActive(item.url) ? 'text-red-600 font-medium' : ''}>{item.title}</span>}
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
