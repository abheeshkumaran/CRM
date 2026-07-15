import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn, isAdmin, isOrgAdmin, isSuperAdmin, canAccessSettings, isManager } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  Building,
  Target,
  CheckSquare,
  Megaphone,
  PieChart,
  User,
  Settings,
  LogOut,
  Zap,
  GitBranch,
  MapPin,
  Phone,
  PhoneCall,
  Package,
  FileText,
  Trophy,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Globe,
  CreditCard,
  Smartphone,
  Percent,
  LifeBuoy,
  UsersRound,
  BookOpen,
  Trash2
} from "lucide-react";
import Logo from "./Logo";
import { memo, useState, useEffect } from "react";
import { api } from "@/services/api";
import { clearAndroidToken } from "@/utils/androidBridge";
import { useSocket } from "@/contexts/useSocket";

const menuGroups = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "Sales Engine",
    items: [
      { title: "Leads", href: "/leads", icon: User },
      { title: "Re-Enquiries", href: "/re-enquiries", icon: RefreshCw },
      { title: "Accounts", href: "/accounts", icon: Building },
      { title: "Opportunities", href: "/opportunities", icon: Target },
      { title: "Products", href: "/products", icon: Package },
      { title: "EMI Schedules", href: "/emi-schedules", icon: CreditCard },
      { title: "Commissions", href: "/sales/commissions", icon: Percent, role: "admin" },
      { title: "Sales Targets", href: "/sales-targets", icon: Trophy },
    ]
  },
  {
    title: "Marketing",
    items: [
      { title: "Campaigns", href: "/marketing", icon: Megaphone, role: "admin" },
      { title: "Ads Manager", href: "/marketing/ads-manager", icon: Megaphone, role: "admin" },
      { title: "WhatsApp", href: "/marketing/whatsapp", icon: MessageSquare, role: "admin" },
      { title: "SMS", href: "/marketing/sms", icon: Smartphone, role: "admin" },
      { title: "Landing Pages", href: "/marketing/landing-pages", icon: Globe, role: "admin" },
      { title: "Web Forms", href: "/marketing/forms", icon: FileText, role: "admin" },
      { title: "Email Lists", href: "/marketing/lists", icon: Users, role: "admin" },
    ]
  },
  {
    title: "Field Force",
    items: [
      { title: "Field Operations", href: "/field-force", icon: MapPin },
    ]
  },
  {
    title: "Connect",
    items: [
      { title: "Call Logs", href: "/calls", icon: PhoneCall },
    ]
  },
  {
    title: "Productivity",
    items: [
      { title: "Follow-ups", href: "/follow-ups", icon: Calendar },
      { title: "Calendar", href: "/calendar", icon: Calendar },
      { title: "Reports", href: "/reports", icon: FileText },
    ]
  },
  {
    title: "System",
    items: [
      { title: "Training", href: "/training", icon: BookOpen },
      { title: "Workflows", href: "/workflows", icon: GitBranch },
      { title: "Automation", href: "/automation", icon: Zap },
      { title: "Hierarchy", href: "/organisation/hierarchy", icon: Users, role: "admin" },
      { title: "Trash", href: "/trash", icon: Trash2, role: "admin" },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Support", href: "/support", icon: LifeBuoy },
    ]
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

// recursive team member component
const TeamMemberItem = ({ member, level = 0 }: { member: any, level?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [subordinates, setSubordinates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { onlineUsers } = useSocket();
  const isOnline = onlineUsers.includes(member.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isExpanded && member.hasSubordinates && subordinates.length === 0) {
      setIsLoading(true);
      api.get(`/users/my-team?parentId=${member.id}`)
        .then(res => setSubordinates(res.data.team || []))
        .finally(() => setIsLoading(false));
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="space-y-1">
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-hover/50 transition-colors cursor-pointer group",
          level > 0 && "ml-4 border-l border-sidebar-border/30"
        )}
        onClick={() => navigate(`/users/${member.id}`)}
      >
        <div className="relative shrink-0">
          <div className="h-6 w-6 rounded-full bg-sidebar-active/20 flex items-center justify-center text-[10px] font-bold text-sidebar-active">
            {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
          </div>
          {isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-green-500 border border-sidebar-bg ring-1 ring-green-500/20 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sidebar-text truncate group-hover:text-sidebar-active transition-colors">
            {member.firstName} {member.lastName}
          </p>
          <p className="text-[10px] text-sidebar-text/60 truncate capitalize">{member.position || member.role}</p>
        </div>
        {member.hasSubordinates && (
          <button
            onClick={handleToggle}
            className="h-5 w-5 rounded-md hover:bg-sidebar-hover flex items-center justify-center text-sidebar-text/60 hover:text-sidebar-text transition-all"
          >
            {isLoading ? (
              <div className="h-3 w-3 border-2 border-sidebar-active/30 border-t-sidebar-active rounded-full animate-spin" />
            ) : (
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
            )}
          </button>
        )}
      </div>
      {isExpanded && subordinates.length > 0 && (
        <div className="space-y-1">
          {subordinates.map(sub => (
            <TeamMemberItem key={sub.id} member={sub} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export function SidebarContent({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const [user, setUser] = useState(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try { return JSON.parse(userStr); } catch (e) { console.error(e); }
    }
    return null;
  });

  useEffect(() => {
    const handleRefresh = (e: any) => {
      if (e.detail) setUser(e.detail);
    };
    window.addEventListener('auth-refresh', handleRefresh);
    return () => window.removeEventListener('auth-refresh', handleRefresh);
  }, []);

  const userIsSuperAdmin = isSuperAdmin(user);

  // My Team data for sidebar hierarchy
  const [teamData, setTeamData] = useState<{ team: any[]; managedBranches: any[] }>({ team: [], managedBranches: [] });
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);

  // Auto-expand System group if active page is under System
  useEffect(() => {
    const isSystemRoute = ['/training', '/workflows', '/automation', '/organisation/hierarchy', '/trash', '/settings', '/support'].some(
      route => pathname === route || pathname.startsWith(route + '/')
    );
    if (isSystemRoute) {
      setSystemExpanded(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (user) {
      api.get('/users/my-team')
        .then(res => setTeamData(res.data || { team: [], managedBranches: [] }))
        .catch(() => { });
    }
  }, [user]);



  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('autoLogin');
    clearAndroidToken();
    navigate('/login');
  };

  const filteredGroups = userIsSuperAdmin ? [] : menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.title === 'Settings') return canAccessSettings(user);
      if (item.title === 'Re-Enquiries') {
        return isAdmin(user) || isManager(user) || (user?.permissions && (user.permissions.includes('leads:*') || user.permissions.includes('leads:read') || user.permissions.includes('*')));
      }
      if (item.role === 'admin' && !isAdmin(user)) return false;
      if (item.role === 'org_admin' && !isOrgAdmin(user)) return false;
      if (item.role === 'manager' && !isManager(user)) return false;
      return true;
    })
  })).filter(group => group.items.length > 0);

  return (
    <div className={cn(
      "flex flex-col h-full bg-sidebar-bg text-sidebar-text transition-all duration-300 border-r border-sidebar-border overflow-hidden",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo & Toggle - Fixed Height Section */}
      <div className={cn(
        "relative flex h-20 items-center shrink-0",
        isCollapsed ? "justify-center px-0" : "justify-between px-6"
      )}>
        <Link to="/dashboard" className="flex items-center gap-3">
          <Logo size="lg" showText={!isCollapsed} />
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-8 w-8 text-sidebar-text bg-sidebar-hover/50 hover:text-sidebar-text hover:bg-sidebar-hover rounded-full"
          >
            <ChevronLeft className="h-4 w-4 stroke-[3]" />
          </Button>
        )}

      </div>

      {/* Scrollable Navigation Area */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-ocean overflow-x-hidden">
        <div className="space-y-6">
          {/* Super Admin Section */}
          {userIsSuperAdmin && (
            <div className="mb-2 space-y-1">
              <Link to="/super-admin" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                pathname === '/super-admin' ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <ShieldCheck className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", pathname === '/super-admin' ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
              <Link to="/super-admin?tab=overview" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                pathname === '/super-admin' && (!location.search || location.search.includes('tab=overview')) ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <Building className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", (pathname === '/super-admin' && (!location.search || location.search.includes('tab=overview'))) ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>Organisations</span>}
              </Link>
              <Link to="/super-admin?tab=plans" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                location.search.includes('tab=plans') ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <CreditCard className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", location.search.includes('tab=plans') ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>License Plans</span>}
              </Link>
              <Link to="/super-admin/seo" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                pathname.startsWith('/super-admin/seo') ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <Globe className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", pathname.startsWith('/super-admin/seo') ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>SEO Panel</span>}
              </Link>
              <Link to="/super-admin?tab=roles" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                location.search.includes('tab=roles') ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <ShieldCheck className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", location.search.includes('tab=roles') ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>System Roles</span>}
              </Link>
              <Link to="/super-admin/restore" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                pathname.startsWith('/super-admin/restore') ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <AlertTriangle className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", pathname.startsWith('/super-admin/restore') ? "text-sidebar-bg text-red-500" : "text-red-400 group-hover:text-red-500")} />
                {!isCollapsed && <span className="text-red-400 group-hover:text-red-500">Restore Data</span>}
              </Link>
              <Link to="/settings" className={cn(
                "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                pathname.startsWith('/settings') ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
              )}>
                <Settings className={cn("h-5 w-5 shrink-0 transition-colors stroke-[3]", pathname.startsWith('/settings') ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text")} />
                {!isCollapsed && <span>General Settings</span>}
              </Link>
            </div>
          )}

          {/* Filtered Grouped Menu */}
          {filteredGroups.map((group, groupIndex) => {
            if (group.title === "System") {
              const isAnySystemActive = ['/training', '/workflows', '/automation', '/organisation/hierarchy', '/trash', '/settings', '/support'].some(
                route => pathname === route || pathname.startsWith(route + '/')
              );

              return (
                <div key={groupIndex} className="space-y-1">
                  {/* Collapsible System Button Header */}
                  <button
                    onClick={() => {
                      if (isCollapsed) {
                        setIsCollapsed(false);
                      }
                      setSystemExpanded(!systemExpanded);
                    }}
                    className={cn(
                      "w-full group flex items-center justify-between rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                      isAnySystemActive
                        ? "bg-sidebar-active/10 text-sidebar-active hover:bg-sidebar-active/20"
                        : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                      isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className={cn(
                        "h-5 w-5 shrink-0 transition-colors stroke-[3]",
                        isAnySystemActive ? "text-sidebar-active" : "text-sidebar-text/70 group-hover:text-sidebar-text"
                      )} />
                      {!isCollapsed && <span>System</span>}
                    </div>
                    {!isCollapsed && (
                      <ChevronDown className={cn(
                        "h-4 w-4 shrink-0 transition-transform text-sidebar-text/60 group-hover:text-sidebar-text/80",
                        systemExpanded && "rotate-180"
                      )} />
                    )}
                  </button>

                  {/* Collapsible System Sub-items list */}
                  {systemExpanded && !isCollapsed && (
                    <div className="pl-4 ml-4 border-l border-sidebar-border/30 space-y-1 mt-1 transition-all duration-200">
                      {group.items.map((item, itemIndex) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        return (
                          <Link
                            key={itemIndex}
                            to={item.href}
                            className={cn(
                              "group flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-bold transition-all duration-200",
                              isActive ? "bg-sidebar-active text-sidebar-bg shadow-sm" : "text-sidebar-text/70 hover:text-sidebar-text hover:bg-sidebar-hover/40"
                            )}
                          >
                            <item.icon className={cn(
                              "h-4 w-4 shrink-0 transition-colors stroke-[3.5]",
                              isActive ? "text-sidebar-bg" : "text-sidebar-text/60 group-hover:text-sidebar-text"
                            )} />
                            <span>{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div key={groupIndex} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 text-xs font-bold text-sidebar-text/70 uppercase tracking-wider mb-2 mt-2">
                    {group.title}
                  </div>
                )}
                {group.items.map((item, itemIndex) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={itemIndex}
                      to={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-full px-4 py-3 text-sm font-bold transition-all duration-200",
                        isActive ? "bg-sidebar-active text-sidebar-bg shadow-md" : "text-sidebar-text/80 hover:text-sidebar-text hover:bg-sidebar-hover",
                        isCollapsed && "justify-center px-0 w-12 h-12 mx-auto"
                      )}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 shrink-0 transition-colors stroke-[3]",
                        isActive ? "text-sidebar-bg" : "text-sidebar-text/70 group-hover:text-sidebar-text"
                      )} />
                      {!isCollapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </nav>

      {/* My Team - Collapsible hierarchy section */}
      {!isCollapsed && (
        <div className="border-t border-sidebar-border shrink-0">
          <button
            onClick={() => setTeamExpanded(!teamExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-sidebar-text/70 uppercase tracking-wider hover:text-sidebar-text transition-colors"
          >
            <div className="flex items-center gap-2">
              <UsersRound className="h-3.5 w-3.5" />
              <span>My Team ({teamData.team.length})</span>
            </div>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", teamExpanded && "rotate-180")} />
          </button>
          {teamExpanded && (
            <div className="px-3 pb-3 space-y-1 max-h-60 overflow-y-auto scrollbar-ocean">
              {teamData.team.map((member: any) => (
                <TeamMemberItem key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer - Fixed Height Section */}
      <div className="p-4 border-t border-sidebar-border bg-sidebar-bg mt-auto shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-lg bg-sidebar-active flex items-center justify-center text-sm font-bold text-sidebar-bg shadow-sm">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-sidebar-bg shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-sidebar-text">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-sidebar-text/80 truncate">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-sidebar-text/70 hover:text-sidebar-text hover:bg-sidebar-hover shrink-0"
              >
                <LogOut className="h-4 w-4 stroke-[3]" />
              </Button>
            </>
          )}
          {isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-8 w-8 mx-auto text-sidebar-text/70 hover:text-sidebar-text hover:bg-sidebar-hover shrink-0"
            >
              <LogOut className="h-4 w-4 stroke-[3]" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SidebarComponent({ className, isCollapsed, setIsCollapsed }: SidebarProps & { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col bg-sidebar-bg relative h-full lg:h-screen transition-all duration-300",
      isCollapsed ? "w-20" : "w-full lg:w-64",
      className
    )}>
      <SidebarContent isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Expand Button - Moved outside to avoid clipping */}
      {isCollapsed && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="absolute -right-3 top-20 translate-y-2 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-lg border-2 border-background hover:bg-primary/90 z-50 p-0.5"
        >
          <ChevronRight className="h-3 w-3 stroke-[3]" />
        </Button>
      )}
    </div>
  );
}

export const Sidebar = memo(SidebarComponent);
