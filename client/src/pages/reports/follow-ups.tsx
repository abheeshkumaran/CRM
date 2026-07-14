import { useQuery } from "@tanstack/react-query";
import { getTasks, type Task } from "@/services/taskService";
import { getFollowUps } from "@/services/followUpService";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format, isToday, isPast, isFuture, isSameDay } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { toast } from "sonner";
import { useState } from "react";
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { getBranches } from "@/services/settingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from "lucide-react";

// Helper
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

export default function FollowUpReportsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewType = searchParams.get('type') || 'all';

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

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['tasks-report', selectedBranchId],
    queryFn: () => getFollowUps({ limit: 10000, status: 'all', branchId: selectedBranchId === "all" ? undefined : selectedBranchId }),
  });

  const tasks = (tasksResponse as { tasks: Task[] })?.tasks || [];

  // --- Filter Logic ---
  const getFilteredTasks = () => {
    // We are interested in "Follow Ups", which are generally Tasks.
    // If we need to distinguish "Interaction Follow-ups" vs "Task Follow-ups", 
    // usually in this system they are Tasks.

    switch (viewType) {
      case 'overdue':
        return tasks.filter((t: Task) =>
          t.dueDate && isPast(new Date(t.dueDate)) && t.status !== 'completed'
        );
      case 'today':
        return tasks.filter((t: Task) =>
          t.dueDate && isSameDay(new Date(t.dueDate), new Date())
        );
      case 'upcoming':
        return tasks.filter((t: Task) =>
          t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
        );
      case 'all':
      default:
        return tasks;
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reports')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Follow Up Reports</h1>
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
            const response = await api.get(`/reports/export/tasks`, {
              responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `tasks_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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

      <Card>
        <CardHeader>
          <CardTitle>
            {viewType === 'overdue' ? "Overdue Follow Ups" :
              viewType === 'today' ? "Today's Follow Ups" :
                viewType === 'upcoming' ? "Upcoming Follow Ups" : "All Follow Ups"}
          </CardTitle>
          <CardDescription>{filteredTasks.length} records found.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <FollowUpTable tasks={filteredTasks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FollowUpTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No follow ups found for the selected criteria.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Related To</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Assigned To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell className="font-medium">{task.subject}</TableCell>
            <TableCell>
              <span className="text-[10px] font-bold uppercase tracking-tighter bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                {(task as any).branch?.name || '-'}
              </span>
            </TableCell>
            <TableCell>
              {task.relatedTo ? (
                <span className="text-sm">
                  {task.onModel}: {task.relatedTo.firstName || task.relatedTo.name} {task.relatedTo.lastName || ''}
                </span>
              ) : '-'}
            </TableCell>
            <TableCell>
              <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>{task.status}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>{task.priority}</Badge>
            </TableCell>
            <TableCell>{formatDate(task.dueDate)}</TableCell>
            <TableCell>{task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
