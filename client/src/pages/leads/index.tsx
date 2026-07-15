import React, { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { type RowSelectionState } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { getLeads, type Lead } from "@/services/leadService"
import { getTasks, type Task } from "@/services/taskService"
import { getFollowUps } from "@/services/followUpService"
import { getUsers } from "@/services/userService"
import { getBranches } from "@/services/settingsService"
import { EnvironmentWarning } from "@/components/shared/EnvironmentWarning"
import { LoadingCard } from "@/components/ui/loading-spinner"
import * as XLSX from 'xlsx'
import { toast } from "sonner"
import { formatWhatsAppNumber } from "@/lib/utils"
import { isMobileApp, initiateCall as initiateCallBridge } from "@/utils/mobileBridge"
import { Button } from "@/components/ui/button"
import { Link, useSearchParams } from "react-router-dom"
import {
  Plus,
  Phone,
  MessageCircle,
  CalendarCheck,
  RefreshCw,
  Download,
  ArrowUpDown,
  Users,
  CheckCircle2,
  X,
  Building,
  LayoutGrid,
  Search,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  Shuffle,
  Settings
} from "lucide-react"
import { BulkActionsToolbar } from "@/components/shared/BulkActionsToolbar"
import { BulkAssignDialog } from "./BulkAssignDialog"
import { BulkStatusDialog } from "./BulkStatusDialog"
import { SetShufflerDialog } from "./SetShufflerDialog"
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog"
import { bulkLeadAction } from "@/services/leadService"
import { isOrgAdmin as checkIsOrgAdmin } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select"

// --- Sidebar Item Component (removed - now using dropdown) ---


import {
  format,
  isSameDay,
  isPast,
  isFuture,
  isToday,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  eachDayOfInterval,
  isBefore,
  isAfter
} from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { LeadTableRow } from "./LeadTableRow"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar as CalendarIcon } from "lucide-react"

// --- Helper Components & Logic ---

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Task Table Component (Simple version for Follow Ups view)
function TaskTable({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return <div className="text-center py-8 text-muted-foreground">No tasks found.</div>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Related To</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Assigned To</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => {
          let statusClassName = "capitalize ";
          switch (task.status) {
            case 'completed': statusClassName += "bg-success/10 text-success border-success/20"; break;
            case 'in_progress': statusClassName += "bg-warning/10 text-warning border-warning/20"; break;
            case 'deferred': statusClassName += "bg-muted text-muted-foreground border-border"; break;
            case 'not_started': default: statusClassName += "bg-blue-500/10 text-blue-500 border-blue-500/20"; break;
          }

          return (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.subject}</TableCell>
              <TableCell>
                {task.relatedTo ? `${task.onModel}: ${task.relatedTo.firstName || task.relatedTo.name || ''} ${task.relatedTo.lastName || ''}`.trim() : '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusClassName}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>{task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell>{task.assignedTo?.firstName || 'Unknown'} {task.assignedTo?.lastName || ''}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Chart Components
const StatusPieChart = React.memo(({ data }: { data: { name: string; value: number }[] }) => (
  <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} >
    <RechartsPie>
      <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
      </Pie>
      <Tooltip />
      <Legend />
    </RechartsPie>
  </ResponsiveContainer>
));

const VerticalBarChart = React.memo(({ data }: { data: { name: string; value: number }[] }) => (
  <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} >
    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="name" type="category" width={100} />
      <Tooltip />
      <Bar dataKey="value" fill="#8884d8" />
    </BarChart>
  </ResponsiveContainer>
));


// --- Mobile Lead Card ---
const LeadCard = ({ lead }: { lead: Lead }) => {
  const phone = formatWhatsAppNumber(lead.phone, lead.phoneCountryCode);

  const handleWhatsApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) {
      toast.error('No phone number available for this lead');
      return;
    }

    const callSessionId = crypto.randomUUID();

    try {
      const userInfo = localStorage.getItem('userInfo');
      const token = userInfo ? JSON.parse(userInfo).token : null;
      await fetch(`/api/interactions/leads/${lead.id}/quick-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: 'whatsapp', phoneNumber: phone, callSessionId })
      });
    } catch (err) {
      console.warn('Failed to log WhatsApp interaction:', err);
    }
    window.location.href = `https://wa.me/${phone}`;
  };

  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!phone) return;

    const callSessionId = crypto.randomUUID();

    // DUAL TRIGGER: Try bridge AND standard tel link for reliability
    initiateCallBridge(phone, callSessionId);

    // Always fire tel link on mobile just in case bridge is restricted
    if (isMobileApp() || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      window.location.href = `tel:${phone}`;
    }

    try {
      const userInfo = localStorage.getItem('userInfo');
      const token = userInfo ? JSON.parse(userInfo).token : null;
      await fetch(`/api/interactions/leads/${lead.id}/quick-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: 'call', phoneNumber: phone, callSessionId })
      });
    } catch (err) {
      console.warn('Failed to log Call interaction:', err);
    }
  };

  const { getStatusDetails } = useLeadStatuses();
  const { label, color } = getStatusDetails(lead.status);

  return (
    <Card className="shadow-sm border-l-4 overflow-hidden" style={{ borderLeftColor: color }}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h4 className="font-bold text-foreground truncate">{lead.firstName} {lead.lastName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-muted-foreground truncate font-medium">{lead.phone || 'No phone'}</p>
              {lead.phone && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(lead.phone!);
                    toast.success('Number copied');
                  }}
                  className="p-1 hover:bg-primary/10 rounded-md text-muted-foreground/60 hover:text-primary transition-colors"
                  title="Copy Number"
                >
                  <Copy className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] uppercase font-bold tracking-tighter"
            style={{
              backgroundColor: `${color}15`,
              color: color,
              borderColor: `${color}30`
            }}
          >
            {label}
          </Badge>
        </div>

        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Plus className="h-3 w-3" />
            <span>{format(new Date(lead.createdAt), 'MMM d')}</span>
          </div>
          {(lead.sourceDetails?.campaignName || lead.sourceDetails?.metaCampaignName) && (
            <div className="flex items-center gap-1 text-primary/80 font-medium truncate max-w-[150px]">
              <span className="w-1 h-1 rounded-full bg-primary/40" />
              <span className="truncate">{lead.sourceDetails?.campaignName || lead.sourceDetails?.metaCampaignName}</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-border">
          <div className="flex gap-4">
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0 text-success border-success/20 hover:bg-success/10 rounded-xl"
              onClick={handleWhatsApp}
              title="WhatsApp"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-10 w-10 p-0 text-info border-info/20 hover:bg-info/10 rounded-xl"
              onClick={handleCall}
              title="Call"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </div>
          <Link to={`/leads/${lead.id}`}>
            <Button size="sm" variant="ghost" className="text-xs h-10 px-4 rounded-xl font-bold uppercase tracking-tight text-primary">
              Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default function LeadsPage() {
  const { statuses, getStatusDetails } = useLeadStatuses()
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const updateSearchParams = useCallback((newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Default view is 'all-leads' if not specified
  const currentView = searchParams.get('view') || 'all-leads';
  const currentSort = searchParams.get('sort') || 'newest';
  const currentOwner = searchParams.get('owner') || 'all';
  const currentBranch = searchParams.get('branch') || 'all';
  const currentSource = searchParams.get('source') || 'all';
  const currentStatus = searchParams.get('status') || 'all';

  // Save active filters to sessionStorage whenever they change
  useEffect(() => {
    const paramsString = searchParams.toString();
    if (paramsString) {
      sessionStorage.setItem('last-leads-filters', paramsString);
    }
  }, [searchParams]);

  // Restore filters on mount if URL is empty
  useEffect(() => {
    if (!searchParams.get('view')) {
      const savedFilters = sessionStorage.getItem('last-leads-filters');
      if (savedFilters) {
        setSearchParams(new URLSearchParams(savedFilters));
      }
    }
  }, []);

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [isBulkStatusDialogOpen, setIsBulkStatusDialogOpen] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isSetShufflerOpen, setIsSetShufflerOpen] = useState(false);

  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const setPageSize = (val: number | ((prev: number) => number)) => {
    const next = typeof val === 'function' ? val(pageSize) : val;
    updateSearchParams({ pageSize: next.toString() });
  };

  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';
  const dateFilter = useMemo(() => ({ from: dateFrom, to: dateTo }), [dateFrom, dateTo]);

  const hasActiveFilters = useMemo(() => {
    return (
      currentView !== 'all-leads' ||
      currentStatus !== 'all' ||
      currentOwner !== 'all' ||
      currentBranch !== 'all' ||
      currentSource !== 'all' ||
      dateFrom !== '' ||
      dateTo !== ''
    );
  }, [currentView, currentStatus, currentOwner, currentBranch, currentSource, dateFrom, dateTo]);


  const handleClearAllFilters = () => {
    setSearchParams(new URLSearchParams({
      view: 'all-leads',
      status: 'all',
      sort: 'newest',
      owner: 'all',
      branch: 'all',
      source: 'all'
    }));
  };
  const setDateFilter = (val: { from: string; to: string } | ((prev: { from: string; to: string }) => { from: string; to: string })) => {
    const next = typeof val === 'function' ? val({ from: dateFrom, to: dateTo }) : val;
    updateSearchParams({ dateFrom: next.from || undefined, dateTo: next.to || undefined });
  };

  const backendDateFilter = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (currentView === 'today-leads' || currentView === 'today') {
      return { from: todayStr, to: todayStr };
    }
    if (currentView === 'yesterday-leads' || currentView === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterdayStr = d.toISOString().split('T')[0];
      return { from: yesterdayStr, to: yesterdayStr };
    }
    if (currentView === 'today-yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterdayStr = d.toISOString().split('T')[0];
      return { from: yesterdayStr, to: todayStr };
    }
    if (currentView === 'last-7-days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const startStr = d.toISOString().split('T')[0];
      return { from: startStr, to: todayStr };
    }
    if (currentView === 'last-14-days') {
      const d = new Date();
      d.setDate(d.getDate() - 13);
      const startStr = d.toISOString().split('T')[0];
      return { from: startStr, to: todayStr };
    }
    if (currentView === 'last-28-days') {
      const d = new Date();
      d.setDate(d.getDate() - 27);
      const startStr = d.toISOString().split('T')[0];
      return { from: startStr, to: todayStr };
    }
    if (currentView === 'last-30-days') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      const startStr = d.toISOString().split('T')[0];
      return { from: startStr, to: todayStr };
    }

    return dateFilter;
  }, [currentView, dateFilter]);

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const userRole = typeof userInfo.role === 'object' ? userInfo.role.id : userInfo.role;
  const isAdminOrManager = ['admin', 'manager', 'organisation_admin', 'super_admin'].includes(userRole?.toLowerCase());
  const isOrgAdmin = checkIsOrgAdmin(userInfo);

  const [isDeleting, setIsDeleting] = useState(false);

  // Manual refresh function
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
  };

  // --- Data Fetching ---
  // 1. Leads
  const { data: leadData, isLoading: leadsLoading, isFetching: leadsFetching } = useQuery({
    queryKey: ['leads', 'all', currentOwner, currentBranch, currentSource, currentStatus, backendDateFilter],
    queryFn: () => getLeads({
      pageSize: 1000,
      assignedTo: currentOwner === 'all' ? undefined : currentOwner,
      branchId: currentBranch === 'all' ? undefined : currentBranch,
      source: currentSource === 'all' ? undefined : currentSource,
      status: currentStatus === 'all' ? undefined : currentStatus,
      startDate: backendDateFilter.from || undefined,
      endDate: backendDateFilter.to || undefined
    }),
  });

  // 2. Tasks (Follow Ups)
  const { data: taskData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all'],
    queryFn: () => getFollowUps({ limit: 1000 }),
  });

  const handleBulkAction = async (action: string) => {
    const leadIds = Object.keys(rowSelection);
    console.log('[BulkAction] Action received:', action, 'LeadIds:', leadIds);
    if (leadIds.length === 0) {
      console.warn('[BulkAction] No leads selected, aborting');
      return;
    }

    switch (action) {
      case 'update-status':
        console.log('[BulkAction] Opening status dialog');
        setIsBulkStatusDialogOpen(true);
        break;
      case 'assign':
        console.log('[BulkAction] Opening assign dialog');
        setIsBulkAssignDialogOpen(true);
        break;
      case 'delete':
        console.log('[BulkAction] Opening move to trash dialog');
        setShowBulkDeleteDialog(true);
        break;
      case 'export':
        handleExcelDownload();
        break;
      default:
        console.warn(`Action ${action} not implemented for leads`);
    }
  };

  const handleBulkDelete = async () => {
    const leadIds = Object.keys(rowSelection);
    if (leadIds.length === 0) return;

    setIsDeleting(true);
    try {
      await bulkLeadAction('delete', leadIds);
      toast.success(`${leadIds.length} leads moved to trash`);
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ['trash'] });
      handleRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leads");
    } finally {
      setIsDeleting(false);
      setShowBulkDeleteDialog(false);
    }
  };
  // 3. Users for Owner Filter
  const { data: userData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => getUsers(),
  });

  // 4. Branches for Branch Filter
  const { data: branchData } = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: () => getBranches(),
  });

  const leads = (leadData?.leads || []).filter((l: Lead) => l && typeof l === 'object');
  const tasks = (taskData?.tasks || []).filter((t: Task) => t && typeof t === 'object');
  const users = userData?.users || (Array.isArray(userData) ? userData : []);
  const branches = branchData || [];

  const activeFiltersList = useMemo(() => {
    const list = [];

    if (currentView !== 'all-leads') {
      let label = currentView;
      if (currentView === 'today-leads' || currentView === 'today') label = "Today";
      else if (currentView === 'yesterday-leads' || currentView === 'yesterday') label = "Yesterday";
      else if (currentView === 'today-yesterday') label = "Today and yesterday";
      else if (currentView === 'last-7-days') label = "Last 7 days";
      else if (currentView === 'last-14-days') label = "Last 14 days";
      else if (currentView === 'last-28-days') label = "Last 28 days";
      else if (currentView === 'last-30-days') label = "Last 30 days";
      else if (currentView === 'no-activity-leads') label = "No Activity";
      list.push({
        key: 'view',
        label,
        clear: () => updateSearchParams({ view: 'all-leads' })
      });
    }

    if (currentStatus !== 'all') {
      const found = statuses.find((s: any) => s.id === currentStatus);
      const label = found ? `Stage: ${found.label}` : `Stage: ${currentStatus}`;
      list.push({
        key: 'status',
        label,
        clear: () => updateSearchParams({ status: 'all' })
      });
    }

    if (currentOwner !== 'all') {
      const found = users.find((u: any) => u.id === currentOwner);
      const label = found ? `Assigned to: ${found.firstName} ${found.lastName || ''}` : `Owner: ${currentOwner}`;
      list.push({
        key: 'owner',
        label,
        clear: () => updateSearchParams({ owner: 'all' })
      });
    }

    if (currentBranch !== 'all') {
      const found = branches.find((b: any) => b.id === currentBranch);
      const label = found ? `Branch: ${found.name}` : `Branch: ${currentBranch}`;
      list.push({
        key: 'branch',
        label,
        clear: () => updateSearchParams({ branch: 'all' })
      });
    }

    if (currentSource !== 'all') {
      list.push({
        key: 'source',
        label: `Source: ${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}`,
        clear: () => updateSearchParams({ source: 'all' })
      });
    }

    if (dateFrom || dateTo) {
      let label = '';
      if (dateFrom && dateTo) {
        label = `Date: ${dateFrom} to ${dateTo}`;
      } else if (dateFrom) {
        label = `Date: From ${dateFrom}`;
      } else if (dateTo) {
        label = `Date: To ${dateTo}`;
      }
      list.push({
        key: 'date',
        label,
        clear: () => updateSearchParams({ dateFrom: undefined, dateTo: undefined })
      });
    }

    return list;
  }, [currentView, currentStatus, currentOwner, currentBranch, currentSource, dateFrom, dateTo, statuses, users, branches, updateSearchParams]);

  // Sort function
  const sortLeads = (leadsToSort: Lead[]) => {
    const sorted = [...leadsToSort];
    switch (currentSort) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'last-updated':
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'last-enquiry':
        return sorted.sort((a, b) => {
          const dateA = a.lastEnquiryDate ? new Date(a.lastEnquiryDate).getTime() : 0;
          const dateB = b.lastEnquiryDate ? new Date(b.lastEnquiryDate).getTime() : 0;
          return dateB - dateA;
        });
      case 'name-asc':
        return sorted.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
      case 'name-desc':
        return sorted.sort((a, b) => (b.firstName || '').localeCompare(a.firstName || ''));
      case 'owner-asc':
        return sorted.sort((a, b) => {
          const nameA = a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName || ''}`.trim() : '';
          const nameB = b.assignedTo ? `${b.assignedTo.firstName} ${b.assignedTo.lastName || ''}`.trim() : '';
          return nameA.localeCompare(nameB);
        });
      case 'owner-desc':
        return sorted.sort((a, b) => {
          const nameA = a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName || ''}`.trim() : '';
          const nameB = b.assignedTo ? `${b.assignedTo.firstName} ${b.assignedTo.lastName || ''}`.trim() : '';
          return nameB.localeCompare(a.firstName || '');
        });
      default:
        return sorted;
    }
  };


  // --- View Logic ---
  const getDisplayData = () => {
    let baseLeads = leads;

    // Apply date range filter if set
    if (dateFilter.from || dateFilter.to) {
      baseLeads = leads.filter((l: Lead) => {
        const leadDate = new Date(l.createdAt);
        if (dateFilter.from && leadDate < new Date(dateFilter.from)) return false;
        if (dateFilter.to) {
          const toDate = new Date(dateFilter.to);
          toDate.setHours(23, 59, 59, 999);
          if (leadDate > toDate) return false;
        }
        return true;
      });
    }

    switch (currentView) {
      // Leads Views
      case 'all-leads':
      case 'today-leads': // Backend now handles date, but we keep this case for consistency
      case 'yesterday-leads':
        return baseLeads;
      case 'no-activity-leads':
        // Placeholder: simple check if updated recently? Or just return all for now as specific API needed.
        // Let's filter by updated > 30 days ago for "No Activity" mock
        return baseLeads.filter((l: Lead) => isPast(new Date(l.updatedAt)) && new Date(l.updatedAt).getTime() < Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Dynamic Status Views
      default:
        if (currentView.startsWith('status-')) {
          // Backend now handles status filtering
          return baseLeads;
        }

        // Task Views
        if (currentView.includes('followup')) {
          const displayTasks = dateFilter.from || dateFilter.to
            ? tasks.filter((t: Task) => {
              const taskDate = t.dueDate ? new Date(t.dueDate) : null;
              if (!taskDate) return false;
              if (dateFilter.from && taskDate < new Date(dateFilter.from)) return false;
              if (dateFilter.to) {
                const toDate = new Date(dateFilter.to);
                toDate.setHours(23, 59, 59, 999);
                if (taskDate > toDate) return false;
              }
              return true;
            })
            : tasks;

          switch (currentView) {
            case 'all-followups': return displayTasks;
            case 'overdue-followups': return displayTasks.filter((t: Task) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'completed');
            case 'today-followups': return displayTasks.filter((t: Task) => t.dueDate && isSameDay(new Date(t.dueDate), new Date()) && t.status !== 'completed');
            case 'upcoming-followups': return displayTasks.filter((t: Task) => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== 'completed');
          }
        }

        return baseLeads;
    }
  };

  const displayData = useMemo(() => getDisplayData(), [leads, tasks, currentView]);
  const isTaskView = currentView.includes('followup');
  const isChartView = ['leads-by-status', 'leads-by-source', 'leads-by-ownership'].includes(currentView);

  const sortedDisplayData = useMemo(() => {
    return isTaskView ? displayData : sortLeads(displayData as Lead[]);
  }, [displayData, isTaskView, currentSort]);

  // Pagination display logic
  const totalFilteredLeads = (sortedDisplayData as Lead[]).length;
  const currentRangeEnd = Math.min(pageSize, totalFilteredLeads);
  const paginationLabel = totalFilteredLeads > 0
    ? <span className="text-sm font-medium whitespace-nowrap ml-2">
      <span className="font-bold">1 - {currentRangeEnd}</span> of <span className="font-bold">{totalFilteredLeads}</span>
    </span>
    : <span className="text-sm text-muted-foreground ml-2">0 leads</span>;

  // --- Chart Data Helpers ---
  const getChartData = () => {
    const counts: Record<string, number> = {};
    if (currentView === 'leads-by-status') {
      leads.forEach((l: Lead) => {
        const label = getStatusDetails(l.status).label;
        counts[label] = (counts[label] || 0) + 1;
      });
    } else if (currentView === 'leads-by-source') {
      leads.forEach((l: Lead) => { counts[l.source] = (counts[l.source] || 0) + 1; });
    } else if (currentView === 'leads-by-ownership') {
      leads.forEach((l: Lead) => {
        const name = l.assignedTo ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}` : 'Unassigned';
        counts[name] = (counts[name] || 0) + 1;
      });
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }


  const handleViewChange = (view: string) => {
    updateSearchParams({ view });
  };

  const handleStatusChange = (status: string) => {
    updateSearchParams({ status: status === 'all' ? undefined : status });
  };

  const handleSortChange = (sort: string) => {
    updateSearchParams({ sort });
  };

  const handleOwnerChange = (owner: string) => {
    updateSearchParams({ owner });
  };

  const handleBranchChange = (branch: string) => {
    updateSearchParams({ branch });
  };

  const handleSourceChange = (source: string) => {
    updateSearchParams({ source });
  };

  // Excel download function
  const handleExcelDownload = () => {
    const dataToExport = sortedDisplayData as Lead[];

    const excelData = dataToExport.map((lead: Lead) => ({
      'First Name': lead.firstName || '',
      'Last Name': lead.lastName || '',
      'Email': lead.email || '',
      'Phone': lead.phone || '',
      'Company': lead.company || '',
      'Status': lead.status || '',
      'Source': lead.source || '',
      'Lead Score': lead.leadScore || 0,
      'Assigned To': lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '',
      'Created At': lead.createdAt ? format(new Date(lead.createdAt), 'yyyy-MM-dd HH:mm:ss') : '',
      'Country': lead.country || '',
      'Re-Enquiry': lead.isReEnquiry ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = Object.keys(excelData[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, 10), maxWidth)
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `leads_${currentView}_${currentSort}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const isLoading = leadsLoading || tasksLoading;

  const isAnalyticsView = currentView === 'leads-analytics';

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Main Content */}
      <div className="flex-1 flex flex-col space-y-6 min-w-0">

        {/* Environment Warning - Optional on mobile */}
        <div className="hidden sm:block">
          <EnvironmentWarning />
        </div>

        {/* Header Area */}
        <div className="space-y-4 px-2 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 hidden sm:flex">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-foreground capitalize tracking-tight flex items-center gap-2">
                  {currentView.replace(/-/g, ' ')}
                  <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold border border-primary/20">
                    {leadData?.total || 0}
                  </div>
                </h1>
                <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  {isTaskView ? 'Manage follow-ups' : isAnalyticsView ? 'Performance' : 'Real-time'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {!isTaskView && !isChartView && !isAnalyticsView && (
                <div className="flex items-center gap-2 mr-2">
                  <Button variant="outline" className="h-11 px-4 border-dashed bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all font-semibold rounded-xl">
                    <Shuffle className="h-4 w-4 mr-2 text-primary" />
                    Shuffle
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 px-4 border-dashed bg-background/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all font-semibold rounded-xl"
                    onClick={() => setIsSetShufflerOpen(true)}
                  >
                    <Settings className="h-4 w-4 mr-2 text-primary" />
                    Set Shuffler
                  </Button>
                </div>
              )}
              {!isTaskView && !isChartView && !isAnalyticsView && (
                <Link to="/leads/new">
                  <Button className="h-11 px-6 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold rounded-xl">
                    <Plus className="h-5 w-5 mr-2" />
                    New Lead
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={leadsFetching}
                className="h-11 w-11 p-0 rounded-xl border-dashed bg-background/50 backdrop-blur-sm"
                title="Refresh Data"
              >
                <RefreshCw className={`h-5 w-5 ${leadsFetching ? 'animate-spin text-primary' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={handleClearAllFilters}
                className={`h-11 px-4 rounded-xl border-dashed bg-background/50 backdrop-blur-sm gap-2 font-semibold text-xs transition-all ${hasActiveFilters
                  ? 'text-destructive border-destructive/50 hover:bg-destructive/10'
                  : 'text-muted-foreground/40 border-border/30 opacity-60 cursor-not-allowed'
                  }`}
                disabled={!hasActiveFilters}
                title="Clear All Active Filters"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3 bg-muted/30 p-3 rounded-2xl border border-border/50">
            {/* View Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">View</label>
              <Select value={currentView} onValueChange={handleViewChange}>
                <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                  <SelectValue placeholder="Select View" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-2xl border-border/50">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-widest font-black text-primary/50 py-3">Quick Views</SelectLabel>
                    <SelectItem value="all-leads" className="rounded-lg">All Leads</SelectItem>
                    <SelectItem value="today" className="rounded-lg">Today</SelectItem>
                    <SelectItem value="yesterday" className="rounded-lg">Yesterday</SelectItem>
                    <SelectItem value="today-yesterday" className="rounded-lg">Today and yesterday</SelectItem>
                    <SelectItem value="last-7-days" className="rounded-lg">Last 7 days</SelectItem>
                    <SelectItem value="last-14-days" className="rounded-lg">Last 14 days</SelectItem>
                    <SelectItem value="last-28-days" className="rounded-lg">Last 28 days</SelectItem>
                    <SelectItem value="last-30-days" className="rounded-lg">Last 30 days</SelectItem>
                    <SelectItem value="no-activity-leads" className="rounded-lg">No Activity</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Stage Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Pipeline Stage</label>
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-border/50">
                    <SelectItem value="all" className="rounded-lg font-medium italic">All Stages</SelectItem>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest font-black text-primary/50 py-3 border-t">Stages</SelectLabel>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.id} className="rounded-lg">
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Owner Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Assigned To</label>
                <Select value={currentOwner} onValueChange={handleOwnerChange}>
                  <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                    <SelectValue placeholder="All Owners" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-border/50">
                    <SelectItem value="all" className="rounded-lg font-medium italic">General Pool (All)</SelectItem>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest font-black text-primary/50 py-3 border-t">Active Users</SelectLabel>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                              {user.firstName[0]}{user.lastName?.[0] || ''}
                            </div>
                            <span className="truncate">{user.firstName} {user.lastName || ''}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Branch Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Branch</label>
                <Select value={currentBranch} onValueChange={handleBranchChange}>
                  <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-border/50">
                    <SelectItem value="all" className="rounded-lg font-medium italic">All Locations</SelectItem>
                    <SelectGroup>
                      <SelectLabel className="text-[10px] uppercase tracking-widest font-black text-primary/50 py-3 border-t">Branches</SelectLabel>
                      {branches.map((branch: any) => (
                        <SelectItem key={branch.id} value={branch.id} className="rounded-lg">
                          <div className="flex items-center gap-2">
                            <Building className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate font-medium">{branch.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Source Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Source</label>
                <Select value={currentSource} onValueChange={handleSourceChange}>
                  <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-border/50">
                    <SelectItem value="all" className="rounded-lg italic">All Sources</SelectItem>
                    <SelectGroup>
                      <SelectItem value="website" className="rounded-lg">Website</SelectItem>
                      <SelectItem value="referral" className="rounded-lg">Referral</SelectItem>
                      <SelectItem value="social" className="rounded-lg">Social</SelectItem>
                      <SelectItem value="paid_ad" className="rounded-lg">Paid Ad</SelectItem>
                      <SelectItem value="import" className="rounded-lg">Import</SelectItem>
                      <SelectItem value="api" className="rounded-lg">API</SelectItem>
                      <SelectItem value="manual" className="rounded-lg">Manual</SelectItem>
                      <SelectItem value="whatsapp" className="rounded-lg">WhatsApp</SelectItem>
                      <SelectItem value="meta_leadgen" className="rounded-lg">Meta Ads</SelectItem>
                      <SelectItem value="cold_call" className="rounded-lg">Cold Call</SelectItem>
                      <SelectItem value="email_campaign" className="rounded-lg">Email Campaign</SelectItem>
                      <SelectItem value="meta_ads" className="rounded-lg">Meta Ads</SelectItem>
                      <SelectItem value="google_ads" className="rounded-lg">Google Ads</SelectItem>
                      <SelectItem value="other" className="rounded-lg">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Filter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Date Range</label>
              <PremiumDateRangePicker
                startDate={dateFilter.from}
                endDate={dateFilter.to}
                onUpdate={(start, end) => {
                  setDateFilter({ from: start, to: end });
                }}
              />
            </div>

            {/* Sort Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Sorting</label>
                <Select value={currentSort} onValueChange={handleSortChange}>
                  <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-border/50">
                    <SelectItem value="newest" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Newest First</div>
                    </SelectItem>
                    <SelectItem value="oldest" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Oldest First</div>
                    </SelectItem>
                    <SelectItem value="last-updated" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Last Updated</div>
                    </SelectItem>
                    <SelectItem value="last-enquiry" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Last Enquiry</div>
                    </SelectItem>
                    <SelectItem value="name-asc" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Name (A-Z)</div>
                    </SelectItem>
                    <SelectItem value="owner-asc" className="rounded-lg">
                      <div className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Owner (A-Z)</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Actions Filter */}
            {!isTaskView && !isChartView && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Page Controls</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={pageSize === totalFilteredLeads ? 'all' : pageSize.toString()}
                      onValueChange={(val) => setPageSize(val === 'all' ? totalFilteredLeads : parseInt(val))}
                    >
                      <SelectTrigger className="h-10 bg-background border-border/50 rounded-lg shadow-sm">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-border/50">
                        <SelectItem value="20" className="rounded-lg">20 Per Page</SelectItem>
                        <SelectItem value="50" className="rounded-lg">50 Per Page</SelectItem>
                        <SelectItem value="100" className="rounded-lg">100 Per Page</SelectItem>
                        <SelectItem value="all" className="rounded-lg">Show All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleExcelDownload}
                    disabled={totalFilteredLeads === 0}
                    className="h-10 w-10 border-border/50 bg-background shadow-sm hover:text-green-600 rounded-lg"
                    title="Export to Excel"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={handleClearAllFilters}
                      className="h-10 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-lg font-bold gap-1 shrink-0"
                      title="Clear All Filters"
                    >
                      <X className="h-4 w-4" />
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Row */}
          {activeFiltersList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-background/40 backdrop-blur-sm rounded-xl border border-border/40 p-2.5 shadow-sm">
              <span className="text-xs font-bold text-muted-foreground/80 flex items-center gap-1.5 mr-1 pl-1">
                <Filter className="h-3.5 w-3.5 text-primary/60" />
                ACTIVE FILTERS:
              </span>
              {activeFiltersList.map((filter) => (
                <div
                  key={filter.key}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold border border-primary/20 hover:bg-primary/15 transition-all shadow-sm"
                >
                  <span>{filter.label}</span>
                  <button
                    onClick={filter.clear}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    title={`Clear ${filter.key} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAllFilters}
                className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 rounded-full font-bold gap-1 shrink-0 ml-auto border border-destructive/20 bg-destructive/5 hover:border-destructive/30 shadow-sm transition-all"
                title="Clear All Filters"
              >
                <X className="h-3.5 w-3.5" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 bg-transparent lg:bg-card lg:rounded-xl lg:border lg:shadow-sm flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-6">
              <LoadingCard text="Loading leads..." />
            </div>
          ) : (
            <div className="flex-1">
              {isChartView ? (
                <div className="p-2 sm:p-6">
                  <Card className="border-0 sm:border shadow-sm">
                    <CardHeader className="p-4 sm:p-6"><CardTitle className="text-lg capitalize">{currentView.replace(/-/g, ' ')}</CardTitle></CardHeader>
                    <CardContent className="p-2 sm:p-6 sm:pt-0">
                      {currentView === 'leads-by-status' && <StatusPieChart data={getChartData()} />}
                      {currentView !== 'leads-by-status' && <VerticalBarChart data={getChartData()} />}
                    </CardContent>
                  </Card>
                </div>
              ) : isTaskView ? (
                <div className="p-2 sm:p-4">
                  <TaskTable tasks={displayData as Task[]} />
                </div>
              ) : (
                <div className="p-0">
                  <DataTable
                    columns={columns}
                    data={sortedDisplayData as Lead[]}
                    searchKeys={["firstName", "lastName", "email", "phone", "company"]}
                    mobileCardRender={(lead) => <LeadCard lead={lead} />}
                    initialPageSize={50}
                    pageSize={pageSize}
                    rowSelection={rowSelection}
                    onRowSelectionChangeState={setRowSelection}
                    isVirtual={true}
                    virtualItemHeight={53}
                    CustomRowComponent={LeadTableRow as any}
                    renderSubComponent={({ row }) => {
                      const leadTasks = tasks.filter((t: Task) => t.leadId === row.original.id);
                      return (
                        <div className="p-4 bg-muted/30 rounded-md border border-border/50 shadow-inner my-2 ml-10">
                          <h4 className="text-sm font-semibold mb-2 text-foreground/80 flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4" /> Follow Ups
                          </h4>
                          <TaskTable tasks={leadTasks} />
                        </div>
                      );
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Floating Bar */}
      {Object.keys(rowSelection).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 w-full max-w-2xl px-4">
          <BulkActionsToolbar
            selectedItems={Object.keys(rowSelection)}
            entityType="leads"
            onClearSelection={() => setRowSelection({})}
            onBulkAction={handleBulkAction}
            className="shadow-2xl !mb-0 bg-primary text-primary-foreground border-primary/20"
          />
        </div>
      )}

      {Object.keys(rowSelection).length > 0 && (
        <BulkAssignDialog
          open={isBulkAssignDialogOpen}
          onOpenChange={setIsBulkAssignDialogOpen}
          selectedLeads={Object.keys(rowSelection)}
          onSuccess={() => {
            setRowSelection({});
            handleRefresh();
          }}
        />
      )}

      <SetShufflerDialog
        open={isSetShufflerOpen}
        onOpenChange={setIsSetShufflerOpen}
      />

      <DeleteConfirmationDialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
        onConfirm={handleBulkDelete}
        title={`Move ${Object.keys(rowSelection).length} Leads to Trash`}
        description="Are you sure you want to move these leads to the trash? They can be restored within 7 days."
        confirmText="Move to Trash"
        isDeleting={isDeleting}
      />

      {Object.keys(rowSelection).length > 0 && (
        <BulkStatusDialog
          open={isBulkStatusDialogOpen}
          onOpenChange={setIsBulkStatusDialogOpen}
          selectedLeads={Object.keys(rowSelection)}
          onSuccess={() => {
            setRowSelection({});
            handleRefresh();
          }}
        />
      )}
    </div>
  )
}

interface PremiumDateRangePickerProps {
  startDate: string;
  endDate: string;
  onUpdate: (start: string, end: string) => void;
}

function PremiumDateRangePicker({ startDate, endDate, onUpdate }: PremiumDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedStart, setSelectedStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Default left calendar month view to startDate or current date
  const [leftMonth, setLeftMonth] = useState<Date>(() => {
    if (startDate) {
      return startOfMonth(new Date(startDate));
    }
    return startOfMonth(new Date());
  });

  const rightMonth = addMonths(leftMonth, 1);

  // Sync state when props change or popover opens
  useEffect(() => {
    if (open) {
      setSelectedStart(startDate ? new Date(startDate) : null);
      setSelectedEnd(endDate ? new Date(endDate) : null);
      if (startDate) {
        setLeftMonth(startOfMonth(new Date(startDate)));
      }
    }
  }, [open, startDate, endDate]);

  const presets = [
    { label: 'Today', getValue: () => { const t = new Date(); return { start: t, end: t }; } },
    { label: 'Yesterday', getValue: () => { const t = new Date(); const y = subDays(t, 1); return { start: y, end: y }; } },
    { label: 'Today and yesterday', getValue: () => { const t = new Date(); const y = subDays(t, 1); return { start: y, end: t }; } },
    { label: 'Last 7 days', getValue: () => { const t = new Date(); return { start: subDays(t, 6), end: t }; } },
    { label: 'Last 14 days', getValue: () => { const t = new Date(); return { start: subDays(t, 13), end: t }; } },
    { label: 'Last 28 days', getValue: () => { const t = new Date(); return { start: subDays(t, 27), end: t }; } },
    { label: 'Last 30 days', getValue: () => { const t = new Date(); return { start: subDays(t, 29), end: t }; } },
    { label: 'This week', getValue: () => { const t = new Date(); return { start: startOfWeek(t), end: t }; } },
    { label: 'Last week', getValue: () => { const t = new Date(); const prevWeek = subDays(t, 7); return { start: startOfWeek(prevWeek), end: endOfWeek(prevWeek) }; } },
    { label: 'This month', getValue: () => { const t = new Date(); return { start: startOfMonth(t), end: t }; } },
    { label: 'Last month', getValue: () => { const t = new Date(); const prevMonth = subMonths(t, 1); return { start: startOfMonth(prevMonth), end: endOfMonth(prevMonth) }; } },
    { label: 'Maximum', getValue: () => { const t = new Date(); return { start: new Date(2020, 0, 1), end: t }; } },
    { label: 'Custom', getValue: () => null }
  ];

  const [activePreset, setActivePreset] = useState<string>('Last 30 days');

  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.label);
    const val = preset.getValue();
    if (val) {
      setSelectedStart(val.start);
      setSelectedEnd(val.end);
      setLeftMonth(startOfMonth(val.start));
    } else {
      // Custom
      setSelectedStart(null);
      setSelectedEnd(null);
    }
  };

  const handleDayClick = (day: Date) => {
    setActivePreset('Custom');
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day);
      setSelectedEnd(null);
    } else if (selectedStart && !selectedEnd) {
      if (isBefore(day, selectedStart)) {
        setSelectedStart(day);
        setSelectedEnd(null);
      } else {
        setSelectedEnd(day);
      }
    }
  };

  const handleUpdate = () => {
    if (selectedStart && selectedEnd) {
      onUpdate(
        format(selectedStart, 'yyyy-MM-dd'),
        format(selectedEnd, 'yyyy-MM-dd')
      );
      setOpen(false);
    } else if (selectedStart) {
      onUpdate(
        format(selectedStart, 'yyyy-MM-dd'),
        format(selectedStart, 'yyyy-MM-dd')
      );
      setOpen(false);
    } else {
      // Reset filters
      onUpdate('', '');
      setOpen(false);
    }
  };

  const renderCalendar = (monthDate: Date) => {
    const startDay = startOfWeek(startOfMonth(monthDate));
    const endDay = endOfWeek(endOfMonth(monthDate));
    const days = eachDayOfInterval({ start: startDay, end: endDay });

    const monthYearStr = format(monthDate, 'MMMM yyyy');
    const [monthName, yearStr] = monthYearStr.split(' ');

    return (
      <div className="flex-1 px-4">
        <div className="text-center font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-center gap-1">
          <span className="capitalize">{monthName}</span>
          <span>{yearStr}</span>
        </div>
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="font-semibold text-gray-400 py-1">{d}</div>
          ))}
          {days.map((day, idx) => {
            const isCurrentMonth = day.getMonth() === monthDate.getMonth();
            const isSelectedStart = selectedStart && isSameDay(day, selectedStart);
            const isSelectedEnd = selectedEnd && isSameDay(day, selectedEnd);

            let isInRange = false;
            if (selectedStart && selectedEnd) {
              isInRange = isAfter(day, selectedStart) && isBefore(day, selectedEnd);
            } else if (selectedStart && hoverDate) {
              isInRange = isAfter(day, selectedStart) && isBefore(day, hoverDate);
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={!isCurrentMonth}
                onClick={() => handleDayClick(day)}
                onMouseEnter={() => !selectedEnd && setHoverDate(day)}
                className={`
                                    h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all relative
                                    ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-700 cursor-default opacity-0' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                    ${isSelectedStart ? '!bg-primary !text-white z-10 shadow-md font-boldScale' : ''}
                                    ${isSelectedEnd ? '!bg-primary !text-white z-10 shadow-md font-boldScale' : ''}
                                    ${isInRange && isCurrentMonth ? 'bg-primary/10 !text-primary rounded-none w-full' : ''}
                                `}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-full h-10 justify-start text-left font-normal bg-background border-border/50 rounded-full shadow-sm hover:bg-muted/50 transition-colors ${open ? 'border-primary ring-2 ring-primary/20' : ''} ${startDate || endDate ? 'text-primary border-primary/30 bg-primary/5' : 'text-muted-foreground'}`}
        >
          <Calendar className="mr-2 h-4 w-4 text-primary" />
          {startDate ? (
            endDate ? (
              <span className="truncate text-xs font-medium">
                {format(new Date(startDate), 'MMM d, yyyy')} - {format(new Date(endDate), 'MMM d, yyyy')}
              </span>
            ) : (
              <span className="truncate text-xs font-medium">From {format(new Date(startDate), 'MMM d, yyyy')}</span>
            )
          ) : (
            <span className="text-xs">Filter by Date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[94vw] max-w-[360px] md:w-[880px] md:max-w-none p-0 rounded-2xl shadow-2xl border border-border/40 overflow-hidden bg-white dark:bg-gray-950" align="start">
        <div className="flex flex-col md:flex-row h-auto md:h-[520px]">
          {/* Left presets panel */}
          <div className="w-full md:w-[200px] border-b md:border-b-0 md:border-r border-border/40 bg-gray-50/50 dark:bg-gray-900/30 p-2 overflow-x-auto md:overflow-y-auto flex flex-row md:flex-col gap-1.5 shrink-0 whitespace-nowrap scrollbar-none">
            {presets.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetClick(p)}
                className={`
                                    text-left px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0
                                    ${activePreset === p.label
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100/70 dark:hover:bg-gray-800/40'}
                                `}
              >
                <div className={`h-3.5 w-3.5 md:h-4 md:w-4 rounded-full border flex items-center justify-center ${activePreset === p.label ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {activePreset === p.label && <div className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-white" />}
                </div>
                {p.label}
              </button>
            ))}
          </div>

          {/* Right Calendars container */}
          <div className="flex-1 flex flex-col p-4 md:p-6 min-w-0">
            {/* Calendars view header/nav */}
            <div className="flex items-center justify-between mb-4 px-2 md:px-4 relative">
              <button
                type="button"
                onClick={() => setLeftMonth(subMonths(leftMonth, 1))}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all absolute left-0 z-10 bg-background"
              >
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all absolute right-0 z-10 bg-background"
              >
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Double calendars side by side (hide second calendar on mobile) */}
            <div className="flex flex-1 gap-6 divide-x divide-border/40">
              {renderCalendar(leftMonth)}
              <div className="hidden md:block md:flex-1 md:pl-6">
                {renderCalendar(rightMonth)}
              </div>
            </div>

            {/* Compare and Inputs Row */}
            <div className="mt-4 md:mt-6 pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 md:gap-6">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4" />
                  Compare
                </label>
                <div className="w-[130px] md:w-[140px]">
                  <Select defaultValue="previous_period">
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="previous_period">Previous period</SelectItem>
                      <SelectItem value="previous_year">Previous year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="border border-border/40 rounded-xl px-2.5 py-1 bg-gray-50/50 dark:bg-gray-900/30 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                  {selectedStart ? format(selectedStart, 'd MMM yyyy') : '-'}
                </div>
                <span className="text-gray-400 text-xs">-</span>
                <div className="border border-border/40 rounded-xl px-2.5 py-1 bg-gray-50/50 dark:bg-gray-900/30 text-[10px] md:text-xs font-bold text-gray-700 dark:text-gray-300">
                  {selectedEnd ? format(selectedEnd, 'd MMM yyyy') : '-'}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-4 pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[10px] text-gray-400 text-center sm:text-left">
                Dates are shown in India Standard Time
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-9 px-4 rounded-xl text-xs font-bold flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleUpdate}
                  className="h-9 px-5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-md shadow-primary/10 flex-1 sm:flex-none"
                >
                  Update
                </Button>
              </div>
            </div>

          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
