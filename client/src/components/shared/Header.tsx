import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { Settings, Zap, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { GlobalSearch } from "./GlobalSearch"
import { NotificationPopover } from "./NotificationPopover"
import { QuickAddLeadDialog } from "./QuickAddLeadDialog"
import { cn, getAssetUrl } from "@/lib/utils"
import { useTheme } from "@/contexts/theme-context"
import { Switch } from "@/components/ui/switch"
import { api } from "@/services/api"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut } from "lucide-react"
import { clearAndroidToken } from "@/utils/androidBridge"

export function Header({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { setTheme, resolvedTheme } = useTheme()

  const [userInfo, setUserInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleAuthRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setUserInfo(detail);
      }
    };
    window.addEventListener('auth-refresh', handleAuthRefresh);
    return () => window.removeEventListener('auth-refresh', handleAuthRefresh);
  }, []);



  const userInitials = userInfo.name
    ? userInfo.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : userInfo.email ? userInfo.email[0].toUpperCase() : 'U';

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('autoLogin');
    clearAndroidToken();
    navigate('/login');
  };

  return (
    <header className={cn("sticky top-0 z-30 flex h-16 items-center gap-2 sm:gap-4 bg-transparent px-2 sm:px-4", className)}>

      <div className="flex-1 min-w-0">
        {/* Search Bar - Condensed on mobile but wider than before */}
        <div className="max-w-[240px] sm:max-w-md">
          <GlobalSearch />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <TooltipProvider>
          {/* Quick Add Lead - Only icon on mobile */}
          <QuickAddLeadDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-warning hover:text-warning/80 hover:bg-warning/10">
                  <Zap className="h-5 w-5 fill-current" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Quick Lead</TooltipContent>
            </Tooltip>
          </QuickAddLeadDialog>

          {/* Notifications */}
          <DropdownMenu>
            <ErrorBoundary name="NotificationPopover">
              <NotificationPopover />
            </ErrorBoundary>
          </DropdownMenu>

          {/* Theme Toggle - Always visible */}
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="h-9 w-9 text-foreground/70 hover:text-foreground"
                >
                  {resolvedTheme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Settings - Desktop Only or through user menu on mobile if needed */}
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/settings')}
                  className="h-9 w-9"
                >
                  <Settings className="h-5 w-5 text-foreground/70 hover:text-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 p-0">
              <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border">
                <AvatarImage
                  src={getAssetUrl(userInfo.avatar?.includes('null') ? undefined : userInfo.avatar)}
                  alt={userInfo.name}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none text-foreground truncate">{userInfo.name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">{userInfo.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuItem
              className="focus:bg-accent focus:text-accent-foreground cursor-pointer"
              onClick={() => navigate(`/users/${userInfo.id || userInfo._id}`)}
            >
              <User className="mr-2 h-4 w-4" />
              <span>View Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="focus:bg-accent focus:text-accent-foreground cursor-pointer md:hidden"
              onClick={() => navigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="focus:bg-destructive/10 focus:text-destructive text-destructive cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
