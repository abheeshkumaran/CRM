import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2 } from "lucide-react";

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string>('all');

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, actionFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (actionFilter !== 'all') params.action = actionFilter;

      const res = await api.get('/audit-logs', { params });
      return res.data;
    }
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track system activity and data changes.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="LOGIN">Login</SelectItem>
              <SelectItem value="CREATE">Create</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No logs found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log: { id: string, createdAt: string, actor?: { firstName: string, lastName: string }, action: string, entity: string, entityId?: string, details: Record<string, any>, ipAddress?: string }) => {
                        const formatAuditDetail = (l: any) => {
                          if (!l.details) return "No additional details";
                          const d = l.details;
                          const action = (l.action || "").toUpperCase();
                          const entityLabel = (l.entity || "").toLowerCase();
                          const name = d.name || d.title || d.email || d.firstName || l.entityId || "item";

                          // Handle specific actions first
                          if (action === "LEAD_STATUS_CHANGE") {
                            const oldStatus = d.oldStatus || d.oldStage || "unknown";
                            const newStatus = d.newStatus || d.newStage || d.status || "unknown";
                            return `Changed status of "${name}" from ${oldStatus} to ${newStatus}`;
                          }

                          if (action === "LOG_QUICK_INTERACTION") {
                            const type = d.type || "activity";
                            return `Logged a quick ${type} for "${name}"`;
                          }

                          if (action === "CONVERT_LEAD") {
                            return `Converted lead "${name}" to Account, Contact, and Opportunity`;
                          }

                          if (action === "OPPORTUNITY_STAGE_CHANGE") {
                            return `Changed stage of opportunity "${name}" from ${d.oldStage || "unknown"} to ${d.newStage || "unknown"}`;
                          }

                          if (action === "REGISTER_ORGANISATION") {
                            return `Registered new organisation: "${d.companyName || name}"`;
                          }

                          if (action === "AUTH_FORGOT_PASSWORD_REQUESTED") {
                            return `Requested password reset link for user: "${d.email || name}"`;
                          }

                          if (action === "AUTH_PASSWORD_RESET_SUCCESS") {
                            return `Successfully reset password for user: "${d.email || name}"`;
                          }

                          if (action.includes("CREATED") || action === "CREATE" || action.includes("CREATE_")) {
                            return `Created new ${entityLabel}: "${name}"`;
                          }
                          if (action.includes("DELETED") || action === "DELETE" || action.includes("DELETE_")) {
                            return `Deleted ${entityLabel} "${name}"`;
                          }
                          if (action.includes("UPDATED") || action === "UPDATE" || action.includes("UPDATE_")) {
                            if (d.updatedFields && Array.isArray(d.updatedFields)) return `Updated ${entityLabel} "${name}": changed ${d.updatedFields.join(", ")}`;
                            if ((d.oldStage || d.oldStatus) && (d.newStage || d.newStatus)) return `Moved ${entityLabel} "${name}" from ${d.oldStage || d.oldStatus} to ${d.newStage || d.newStatus}`;
                            if (d.status) return `Changed ${entityLabel} "${name}" status to ${d.status}`;
                            return `Modified ${entityLabel} details for "${name}"`;
                          }
                          if (action === "LOGIN") return "User logged in";
                          if (action === "LOGOUT") return "User logged out";
                          if (action.includes("INVITE")) return `Invited user: ${d.email || name}`;
                          if (action.includes("DEACTIVATE")) return `Deactivated user: ${d.email || name}`;
                          if (action.includes("ACTIVATE") && !action.includes("DEACTIVATE")) return `Re-activated user: ${d.email || name}`;
                          
                          const parts: string[] = [];
                          if (d.name) parts.push(`Name: ${d.name}`);
                          if (d.email) parts.push(`Email: ${d.email}`);
                          if (d.status) parts.push(`Status: ${d.status}`);
                          return parts.length > 0 ? parts.join(", ") : JSON.stringify(d);
                        };

                        const getReadableAction = (act: string) => {
                          if (!act) return "-";
                          return act
                            .split("_")
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                            .join(" ");
                        };

                        return (
                          <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                            </TableCell>
                            <TableCell>
                              {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${log.action.includes('DELETE') ? 'bg-red-100 text-red-800' :
                                log.action.includes('CREATE') ? 'bg-green-100 text-green-800' :
                                  log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                {getReadableAction(log.action)}
                              </span>
                            </TableCell>
                            <TableCell>
                              {log.entity} <span className="text-xs text-muted-foreground">({log.entityId?.substring(0, 8)}...)</span>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                              {formatAuditDetail(log)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {log.ipAddress || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {page} of {pagination?.pages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= (pagination?.pages || 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
