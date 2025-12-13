import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
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
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const baseMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Contributions", url: "/contribute", icon: Wallet },
  { title: "Project Support", url: "/project-support", icon: Receipt },
  { title: "Withdrawals", url: "/withdraw", icon: ArrowDownLeft },
  { title: "Dividends", url: "/member/dividends", icon: TrendingUp },
  { title: "Investment Plans", url: "/member/property-plans", icon: Building2 },
  { title: "My Invites", url: "/member/referrals", icon: UserPlus },
  { title: "Blog", url: "/blog", icon: FileText },
  { title: "Profile", url: "/member/profile", icon: User },
  { title: "Change Password", url: "/member/change-password", icon: Lock },
  { title: "Support", url: "/contact", icon: HelpCircle },
];

export function MemberHamburgerMenu() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
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
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-left">Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive(item.url)
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
