import { useNavigate, useParams, Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { getUserById, getUserStats } from "@/services/userService"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Mail, Briefcase, BarChart3, Users, CheckCircle2, XCircle, DollarSign, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getLeads } from "@/services/leadService"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "@/pages/leads/columns"
import { api } from "@/services/api"

// Helper to determine if a role can manage others
const canHaveSubordinates = (role?: string) => {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('admin') || r.includes('manager') || r.includes('director') || r.includes('head');
};

// Component to list subordinates
const SubordinatesList = ({ parentId }: { parentId: string }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['user-subordinates', parentId],
    queryFn: () => api.get(`/users/my-team?parentId=${parentId}`).then(res => res.data)
  });

  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  const team = data?.team || [];

  if (team.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No direct reports found.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {team.map((member: any) => (
        <Link key={member.id} to={`/users/${member.id}`}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-white">
                {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate capitalize">{member.role}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default function UserProfilePage() {
  const { formatCurrency } = useCurrency()
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserById(id!)
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', id],
    queryFn: () => getUserStats(id!)
  })

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['user-leads', id],
    queryFn: () => getLeads({ assignedTo: id, pageSize: 1000 }),
    enabled: !!id
  })

  const stats = statsData?.stats;
  const leads = leadsData?.leads || [];

  if (userLoading || statsLoading || leadsLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>
  }

  if (!user || userError) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <Briefcase className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground max-w-xs">
          This account may have been permanently deleted or you do not have permission to view it.
        </p>
        <Button onClick={() => navigate('/settings?tab=team')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Team Settings
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {user.firstName} {user.lastName}
            <Badge variant="outline">{user.role}</Badge>
          </h1>
          <div className="flex items-center gap-4 text-muted-foreground mt-1">
            <div className="flex items-center gap-1"><Mail className="h-4 w-4" /> {user.email}</div>
            {user.position && <div className="flex items-center gap-1"><Briefcase className="h-4 w-4" /> {user.position}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Currently owned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Leads converted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Leads</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.convertedLeads || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Leads</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.lostLeads || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Performance</CardTitle>
          <CardDescription>Estimated revenue from closed deals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            <span className="text-4xl font-bold">{formatCurrency(stats?.totalSalesValue || 0, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Subordinates Section */}
      {canHaveSubordinates(user.role) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Direct Reports
          </h2>
          <SubordinatesList parentId={id!} />
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Assigned Leads
        </h2>
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={leads}
              searchKeys={["firstName", "lastName", "email", "phone", "company"]}
              initialPageSize={1000}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
