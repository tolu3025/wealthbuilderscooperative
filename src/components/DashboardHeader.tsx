import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { MemberHamburgerMenu } from "@/components/MemberHamburgerMenu";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardHeaderProps {
  userName?: string;
  avatarUrl?: string;
}

export function DashboardHeader({ userName = "User", avatarUrl }: DashboardHeaderProps) {
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

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 items-center gap-2 sm:gap-4 border-b bg-background px-3 sm:px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MemberHamburgerMenu />
        <span className="font-bold text-sm sm:text-base md:text-lg hidden sm:inline">WealthBuilders</span>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <NotificationBell />

        {/* Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-full">
              <Avatar className="h-7 w-7 sm:h-9 sm:w-9">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-xs sm:text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-xs sm:text-sm font-medium leading-none truncate">{userName}</p>
                <p className="text-[10px] sm:text-xs leading-none text-muted-foreground">
                  WealthBuilders Member
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-xs sm:text-sm">
              <LogOut className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}