import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Loader2, User, ArrowRight, History } from 'lucide-react';
import { getLeadHistory } from '@/services/leadService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HistoryItem {
  id: string;
  oldOwner?: { firstName: string; lastName: string };
  newOwner?: { firstName: string; lastName: string };
  changedBy?: { firstName: string; lastName: string };
  reason?: string;
  createdAt: string;
}

export function LeadTimeline({ leadId }: { leadId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['lead-history', leadId],
    queryFn: () => getLeadHistory(leadId)
  });

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Lead History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No history recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Lead History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative border-l border-muted ml-3 space-y-6">
          {history.map((item: HistoryItem) => (
            <div key={item.id} className="relative pl-6">
              <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border border-background bg-muted-foreground/30 ring-4 ring-background" />
              <div className="flex flex-col gap-1">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}</span>
                </div>
                <div className="text-sm">
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full text-xs">
                      <User className="h-3 w-3" />
                      {item.oldOwner ? `${item.oldOwner.firstName} ${item.oldOwner.lastName}` : 'Unassigned'}
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <div className="flex items-center gap-1 font-medium bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                      <User className="h-3 w-3" />
                      {item.newOwner ? `${item.newOwner.firstName} ${item.newOwner.lastName}` : 'Unassigned'}
                    </div>
                  </div>
                  {item.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {item.reason}</p>}
                  {item.changedBy && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Changed by {item.changedBy.firstName} {item.changedBy.lastName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
