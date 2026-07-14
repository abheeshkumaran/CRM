import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Download,
  Trash2,
  Loader2,
  Clock,
  Mic,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCalls, getCallStats, deleteCallRecording, type Call, type CallFilters } from '@/services/callService';
import { getBranches } from '@/services/settingsService';
import { getUsers } from '@/services/userService';
import { CallRecordingPlayer } from '@/components/CallRecordingPlayer';
import { api } from '@/services/api';
import { isAdmin } from '@/utils/roleUtils';
import { Building, User2 } from 'lucide-react';

export default function CallsPage() {
  const queryClient = useQueryClient();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const userIsAdmin = isAdmin(userInfo);

  const [filters, setFilters] = useState<CallFilters>({
    page: 1,
    limit: 15,
    direction: 'all',
    status: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  const { data: callsData, isLoading } = useQuery({
    queryKey: ['calls', filters, searchQuery],
    queryFn: () => getCalls({ ...filters, search: searchQuery || undefined })
  });

  const { data: stats } = useQuery({
    queryKey: ['callStats', period, filters.userId],
    queryFn: () => getCallStats(period, filters.userId)
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers()
  });
  
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches()
  });

  const users = usersData?.users || [];
  const branchesList = branchesData || [];
  const showUserFilter = users.length > 1;

  const deleteMutation = useMutation({
    mutationFn: deleteCallRecording,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Recording deleted');
    },
    onError: () => {
      toast.error('Failed to delete recording');
    }
  });

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterChange = (key: keyof CallFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleDownload = async (recordingUrl: string) => {
    try {
      const filename = recordingUrl.split('/').pop();
      const response = await api.get(`/calls/recording/${filename}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || 'recording.webm';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download recording');
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound'
      ? <PhoneIncoming className="h-4 w-4 text-green-600 dark:text-green-400" />
      : <PhoneOutgoing className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 border-0">Completed</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      case 'busy':
        return <Badge variant="secondary">Busy</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'initiated':
        return <Badge variant="outline">In Progress</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  };

  const formatDuration = (minutes?: number, seconds?: number) => {
    // Prefer high-precision seconds (recordingDuration)
    if (seconds !== undefined && seconds !== null && seconds > 0) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Fallback to minutes (might be truncated to Int in DB)
    if (!minutes || minutes <= 0) return '-';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getContactName = (call: Call) => {
    let name = 'Unknown';
    let company = '';

    if (call.lead) {
      name = `${call.lead.firstName} ${call.lead.lastName || ''}`.trim();
      company = call.lead.company || '';
    } else if (call.contact) {
      name = `${call.contact.firstName} ${call.contact.lastName || ''}`.trim();
    }

    return { name, company };
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Call Logs
                </h1>
                <p className="text-muted-foreground mt-1">
                  View and manage all call recordings
                </p>
              </div>
              {userIsAdmin && (
                <Link to="/settings/call-recording">
                  <Button variant="outline" size="sm" className="hover:bg-primary/10 hover:text-primary transition-colors">
                    <Phone className="h-4 w-4 mr-2" />
                    Recording Settings
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/30 border-primary/10"
                onClick={() => setFilters(prev => ({ ...prev, status: 'all', hasRecording: undefined, page: 1 }))}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    Total Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-foreground">
                      {stats?.totalCalls ?? '-'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This {period}
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/30 border-primary/10"
                onClick={() => {
                  setFilters({ page: 1, limit: 15, direction: 'all', status: 'all' });
                  setSearchQuery('');
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                    Avg Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {formatDuration(stats?.avgDuration)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    minutes
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/30 border-primary/10"
                onClick={() => setFilters(prev => ({ ...prev, status: 'missed', hasRecording: undefined, page: 1 }))}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <PhoneMissed className="h-4 w-4 text-destructive" />
                    Missed Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.missedCalls ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.totalCalls ? ((stats.missedCalls / stats.totalCalls) * 100).toFixed(0) : 0}% of total
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-md transition-all cursor-pointer hover:bg-muted/30 border-primary/10"
                onClick={() => setFilters(prev => ({ ...prev, status: 'all', hasRecording: 'true', page: 1 }))}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mic className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    Recordings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-foreground">
                    {stats?.callsWithRecording ?? '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    calls with recordings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2">
              {(['today', 'week', 'month'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className={period === p ? "shadow-md" : ""}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      className="pl-10 bg-background"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Select
                    value={filters.direction}
                    onValueChange={(v) => handleFilterChange('direction', v)}
                  >
                    <SelectTrigger className="w-full md:w-[150px] bg-background">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directions</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => handleFilterChange('status', v)}
                  >
                    <SelectTrigger className="w-full md:w-[150px] bg-background">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="missed">Missed</SelectItem>
                      <SelectItem value="busy">Busy</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.branchId || 'all'}
                    onValueChange={(v) => handleFilterChange('branchId', v)}
                  >
                    <SelectTrigger className="w-full md:w-[150px] bg-background">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All Branches" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branchesList.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {showUserFilter && (
                    <Select
                      value={filters.userId || 'all'}
                      onValueChange={(v) => handleFilterChange('userId', v)}
                    >
                      <SelectTrigger className="w-full md:w-[180px] bg-background">
                        <div className="flex items-center gap-2">
                          <User2 className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="All Agents" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Call Log Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-[180px]">Date & Time</TableHead>
                          <TableHead className="w-[60px]">Dir</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead className="w-[80px]">Duration</TableHead>
                          <TableHead className="w-[100px]">Status</TableHead>
                          <TableHead>Recording</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {callsData?.calls.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              No calls found
                            </TableCell>
                          </TableRow>
                        ) : (
                          callsData?.calls.map((call) => (
                            <TableRow key={call.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium text-foreground">
                                {format(new Date(call.date), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                              <TableCell>
                                {getDirectionIcon(call.direction)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  {(() => {
                                    const { name, company } = getContactName(call);
                                    return (
                                      <>
                                        <p className="font-medium text-foreground">{name}</p>
                                        {company && (
                                          <p className="text-xs text-muted-foreground/80 italic">
                                            {company}
                                          </p>
                                        )}
                                      </>
                                    );
                                  })()}
                                  {call.createdBy && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      by {call.createdBy.firstName} {call.createdBy.lastName}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-foreground">
                                {call.phoneNumber || '-'}
                              </TableCell>
                              <TableCell className="text-foreground">
                                {formatDuration(call.duration, call.recordingDuration)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(call.callStatus)}
                              </TableCell>
                              <TableCell>
                                {call.recordingUrl ? (
                                  <CallRecordingPlayer
                                    recordingUrl={call.recordingUrl}
                                    duration={call.recordingDuration}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">No recording</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {call.recordingUrl && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground"
                                        onClick={() => handleDownload(call.recordingUrl!)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                          if (confirm('Delete this recording?')) {
                                            deleteMutation.mutate(call.id);
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {callsData && callsData.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Showing {((callsData.pagination.page - 1) * callsData.pagination.limit) + 1} to{' '}
                          {Math.min(callsData.pagination.page * callsData.pagination.limit, callsData.pagination.total)} of{' '}
                          {callsData.pagination.total} calls
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={callsData.pagination.page === 1}
                            onClick={() => handlePageChange(callsData.pagination.page - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={callsData.pagination.page >= callsData.pagination.totalPages}
                            onClick={() => handlePageChange(callsData.pagination.page + 1)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
