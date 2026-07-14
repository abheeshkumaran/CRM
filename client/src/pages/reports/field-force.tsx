import { useQuery } from "@tanstack/react-query";
import { getCheckIns, type CheckIn } from "@/services/checkInService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Building } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useState } from "react";
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { getBranches } from "@/services/settingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FieldForceReportsPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [user] = useState<{ role: string } | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });

  const isAdmin = checkIsAdmin(user);

  // Fetch Branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: !!isAdmin
  });

  const { data: checkIns, isLoading, isError } = useQuery<CheckIn[]>({
    queryKey: ['check-ins-report', selectedBranchId],
    queryFn: () => getCheckIns({ branchId: selectedBranchId === "all" ? undefined : selectedBranchId }), // Fetch all check-ins (no filters) for overview
  });

  if (isLoading) {
    return <div className="p-8 space-y-4">
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
      <Skeleton className="h-96 w-full" />
    </div>;
  }

  if (isError) {
    return <div className="p-8 text-destructive">Failed to load field force data.</div>;
  }

  const totalCheckIns = checkIns?.length || 0;
  // Count unique users who checked in
  const activeAgents = new Set(checkIns?.map(c => c.userId)).size;

  // Recent check-ins
  const recentActivity = [...(checkIns || [])].slice(0, 15);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Field Force Activity</h1>
          <p className="text-muted-foreground mt-2">Track agent visits, check-ins, and field operations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && branches && branches.length > 0 && (
            <div className="w-[200px]">
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="bg-background border-border h-10 px-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="All Branches" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button variant="outline" onClick={async () => {
          try {
            const response = await api.get(`/reports/export/check-ins`, {
              responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `field_force_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
          } catch (error) {
            toast.error("Failed to download report");
            console.error("Download error:", error);
          }
        }}>
          Download Excel
        </Button>
      </div>
    </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Check-Ins</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCheckIns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAgents}</div>
          </CardContent>
        </Card>
        {/* Placeholder for future metrics like Distance Traveled or Avg Visits/Day */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest field operations and visits.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location/Entity</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                    No recent activity found.
                  </TableCell>
                </TableRow>
              ) : (
                recentActivity.map((checkIn) => (
                  <TableRow key={checkIn.id}>
                    <TableCell className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{checkIn.user?.firstName?.[0]}{checkIn.user?.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{checkIn.user?.firstName} {checkIn.user?.lastName}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold uppercase tracking-tighter bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                        {(checkIn as any).user?.branch?.name || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{checkIn.type.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {checkIn.lead && <span className="text-xs text-muted-foreground">Lead: {checkIn.lead.firstName} {checkIn.lead.lastName}</span>}
                        {checkIn.contact && <span className="text-xs text-muted-foreground">Contact: {checkIn.contact.firstName} {checkIn.contact.lastName}</span>}
                        {checkIn.account && <span className="text-xs text-muted-foreground">Account: {checkIn.account.name}</span>}
                        <span className="text-sm">{checkIn.address || 'Unknown Location'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(checkIn.createdAt), 'MMM d, h:mm a')}</TableCell>
                    <TableCell className="max-w-xs truncate" title={checkIn.notes}>
                      {checkIn.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
