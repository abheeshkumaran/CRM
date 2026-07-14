import { useQuery } from "@tanstack/react-query"
import { api } from "@/services/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Activity, AlertCircle } from "lucide-react"
import { getAssetUrl } from "@/lib/utils"

export function RecentActivityWidget({ branchId }: { branchId?: string | null }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['recent-activity', branchId],
    queryFn: async () => {
      try {
        const params: any = { limit: 20 };
        if (branchId) params.branchId = branchId;

        const res = await api.get('/audit-logs', { params });
        const logs = res.data?.logs || [];
        return { logs };
      } catch (error) {
        console.error('Error fetching recent activity:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 30000,
  });

  const logs = (Array.isArray(data?.logs) ? data.logs : []).filter((log: unknown) => log && typeof log === 'object');

  if (isError) {
    return (
      <Card className="col-span-3 rounded-3xl bg-card shadow-sm border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load recent activity</p>
            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card className="col-span-3 rounded-3xl bg-card shadow-sm border-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-[350px] pr-4">
            <div className="space-y-4">
              {logs.map((log: any) => {
                // Validate log data
                if (!log || !log.id) {
                  console.warn('Invalid log data:', log);
                  return null;
                }

                const actorName = log.actor
                  ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() || 'Unknown User'
                  : 'System';

                const actorInitials = log.actor?.firstName?.[0] || log.actor?.lastName?.[0] || '?';

                return (
                  <div key={log.id} className="flex items-start gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                    <Avatar className="h-9 w-9 mt-0.5">
                      <AvatarImage
                        src={getAssetUrl(log.actor?.profileImage)}
                        onError={(e) => {
                          // Silently handle missing images
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {actorInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none">
                        <span className="text-foreground">{actorName}</span>
                        <span className="text-muted-foreground font-normal"> {getHumanReadableAction(log.action || 'unknown')} </span>
                        {log.entity && log.entity !== 'Security' && (
                          <span className="text-foreground font-medium">{log.entity}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(() => {
                          try {
                            return formatDistanceToNow(new Date(log.createdAt), { addSuffix: true });
                          } catch (error) {
                            console.error('Date format error:', error);
                            return 'Recently';
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {logs.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No recent activity</p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

function getHumanReadableAction(action: string) {
  const actionMap: Record<string, string> = {
    'LOGIN': 'logged in',
    'LOGIN_FAILED': 'failed login attempt',
    'CREATE': 'created',
    'CREATE_LEAD': 'created lead',
    'CREATE_CONTACT': 'created contact',
    'CREATE_ACCOUNT': 'created account',
    'UPDATE': 'updated',
    'DELETE': 'deleted',
    'EXPORT': 'exported data from',
    'LEAD_STATUS_CHANGE': 'changed status of',
    'UNAUTHORIZED_SUPERADMIN_MODIFICATION_ATTEMPT': 'attempted unauthorized access to',
    'SUPERADMIN_PASSWORD_CHANGE': 'changed password for',
    'security_event': 'security event in',
    'BULK_IMPORT_COMPLETED': 'completed bulk import for'
  };

  return actionMap[action] || action.toLowerCase().replace(/_/g, ' ');
}
