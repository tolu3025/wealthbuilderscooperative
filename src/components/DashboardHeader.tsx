import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DashboardHeaderProps {
  userName?: string;
  notifications?: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
  }>;
}

export function DashboardHeader({ userName = "User", notifications = [] }: DashboardHeaderProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-secondary" />
          <span className="font-bold text-lg hidden md:inline">WealthBuilders</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-2">
              <h4 className="font-semibold">Notifications</h4>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No new notifications</p>
              ) : (
                <div className="space-y-2">
                  {notifications.slice(0, 5).map((notif) => (
                    <div key={notif.id} className="p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-muted-foreground">{notif.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                    </div>
                  ))}
                  {notifications.length > 5 && (
                    <Button variant="link" className="w-full text-xs">
                      View all notifications
                    </Button>
                  )}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  WealthBuilders Member
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
