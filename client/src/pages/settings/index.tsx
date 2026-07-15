import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@/components/ui/card"
import { getUsers, getProfile } from "@/services/settingsService"
import { isAdmin, canAccessSettings, isBranchManager, isManager, checkRole } from "@/lib/utils"

import {
  User,
  Users,
  Building,
  FormInput,
  Map,
  GitBranch,
  Star,
  Webhook,
  Bell,
  ArrowRight,
  Shield,
  Upload,
  Phone,
  CreditCard,
  FileText,
  Shuffle
} from "lucide-react"

const ALL_SETTINGS_SECTIONS = [
  {
    title: "Profile Settings",
    description: "Update your personal information and preferences",
    href: "/settings/profile",
    icon: User,
    gradient: "from-indigo-600 to-violet-600"
  },
  {
    title: "Organisation Details",
    description: "Manage company profile, address, contact info, and upsell configuration",
    href: "/settings/organisation",
    icon: Building,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Team & Users",
    description: "Manage team members, roles, and permissions",
    href: "/settings/team",
    icon: Users,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Branches",
    description: "Manage organization branches and locations",
    href: "/settings/branches",
    icon: Building,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Roles & Permissions",
    description: "Configure access control and user roles",
    href: "/settings/roles",
    icon: Shield,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Custom Fields",
    description: "Add custom fields to leads, contacts, and opportunities",
    href: "/settings/custom-fields",
    icon: FormInput,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Territories",
    description: "Define and manage sales territories",
    href: "/settings/territories",
    icon: Map,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Assignment Rules",
    description: "Configure automatic lead and opportunity assignment",
    href: "/settings/assignment-rules",
    icon: GitBranch,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin', 'branch_manager']
  },
  {
    title: "Lead Scoring",
    description: "Set up scoring rules to prioritize leads",
    href: "/settings/lead-scoring",
    icon: Star,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Lead Statuses",
    description: "Customize lead status labels, colors, and workflow",
    href: "/settings/lead-statuses",
    icon: GitBranch,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Integrations",
    description: "Manage webhooks, APIs, and third-party integrations",
    href: "/settings/integrations",
    icon: Webhook,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Notifications",
    description: "Configure email and in-app notification preferences",
    href: "/settings/notifications",
    icon: Bell,
    gradient: "from-indigo-600 to-violet-600"
  },
  {
    title: "Broadcast Announcements",
    description: "Send persistent popup notifications to all team members in the organisation",
    href: "/settings/broadcast",
    icon: Bell,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Data Migration",
    description: "Data migration from other CRMs.",
    href: "/settings/import",
    icon: Upload,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin', 'branch_manager']
  },
  {
    title: "Bulk Import Leads",
    description: "Upload a CSV or Excel file to import leads in bulk in settings to data migration from other crms.",
    href: "/settings/bulk-import",
    icon: Upload,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin', 'branch_manager']
  },
  {
    title: "Set Shuffler",
    description: "Configure the lead shuffling settings",
    href: "/settings/shuffler",
    icon: Shuffle,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Call Recording",
    description: "Configure automatic call recording and storage settings",
    href: "/settings/call-recording",
    icon: Phone,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "WhatsApp Scraper",
    description: "Control automatic WhatsApp message synchronization from Android devices",
    href: "/settings/whatsapp-scraper",
    icon: Webhook,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Billing & Subscription",
    description: "Manage plans, invoices, and payment methods",
    href: "/settings/billing",
    icon: CreditCard,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
  {
    title: "Audit Logs",
    description: "View system activity and security logs",
    href: "/settings/audit-logs",
    icon: FileText,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin', 'manager']
  },
  {
    title: "Developer / API",
    description: "Connect your website or other tools via API and Webhooks",
    href: "/settings/developer",
    icon: Shield,
    gradient: "from-indigo-600 to-violet-600",
    roles: ['admin']
  },
]

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ role?: string; permissions?: string[] } | null>(() => {
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user', e);
        return null;
      }
    }
    return null;
  });

  const filteredSections = useMemo(() => {
    if (!user) return [];
    const userIsAdmin = isAdmin(user);

    return ALL_SETTINGS_SECTIONS.filter(section => {
      // Profile and Notifications are always visible to everyone
      if (section.href === '/settings/profile' || section.href === '/settings/notifications') {
        return true;
      }

      // If roles are explicitly defined on the section, use those
      if (section.roles && section.roles.length > 0) {
        return checkRole(user, section.roles);
      }

      // All other settings are strictly admin only
      return userIsAdmin;
    });
  }, [user]);

  // Fetch user count
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!user && isAdmin(user) // Only fetch user counts for admins
  });

  const userCount = Array.isArray(usersData) ? usersData.length : (usersData?.users?.length || 0);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Dynamic profile sync to pull updated permissions/roles from the server
    getProfile()
      .then((freshUser) => {
        if (freshUser) {
          const userStr = localStorage.getItem('userInfo');
          const currentUserInfo = userStr ? JSON.parse(userStr) : {};

          const updatedUserInfo = {
            ...currentUserInfo,
            ...freshUser,
            role: typeof freshUser.role === 'object' ? (freshUser.role.id || freshUser.role.name || currentUserInfo.role) : freshUser.role,
            permissions: freshUser.permissions || []
          };

          localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));
          setUser(updatedUserInfo);
        }
      })
      .catch((err) => {
        console.error("Failed to sync user profile", err);
      });
  }, [navigate]);

  if (!user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your CRM configuration and preferences.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-muted/50 border-border backdrop-blur-sm shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{userCount}</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSections.map((section: any, index: number) => (
          <Link key={index} to={section.href}>
            <Card className="h-full bg-card border-border hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 cursor-pointer group overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <section.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {section.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
