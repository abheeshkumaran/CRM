import { useState, useMemo, useCallback, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useSearchParams, useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { getFollowUps } from "@/services/followUpService"
import { getBranches } from "@/services/settingsService"
import { getUsers } from "@/services/userService"
import { Building2, Calendar, Clock, ListFilter, ArrowUpDown, User2, X, Filter, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isToday } from "date-fns"

export default function FollowUpsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterParam = searchParams.get('filter') // overdue, today, upcoming
  const sortBy = searchParams.get('sort') || 'dueDate-asc'
  const statusFilter = searchParams.get('status') || 'all'
  const branchFilter = searchParams.get('branch') || 'all'
  const userFilter = searchParams.get('user') || 'all'
  const [searchQuery, setSearchQuery] = useState("")

  const updateSearchParams = useCallback((newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value === undefined || value === 'all' || (key === 'sort' && value === 'dueDate-asc')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Save active filters to sessionStorage whenever they change
  useEffect(() => {
    const paramsString = searchParams.toString();
    if (paramsString) {
      sessionStorage.setItem('last-followups-filters', paramsString);
    } else {
      sessionStorage.removeItem('last-followups-filters');
    }
  }, [searchParams]);

  // Restore filters on mount if URL has no filters
  useEffect(() => {
    const hasParams = Array.from(searchParams.keys()).some(k => k !== 'filter');
    if (!hasParams) {
      const savedFilters = sessionStorage.getItem('last-followups-filters');
      if (savedFilters) {
        const saved = new URLSearchParams(savedFilters);
        if (filterParam) saved.set('filter', filterParam);
        setSearchParams(saved);
      }
    }
  }, [searchParams, setSearchParams, filterParam]);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches()
  })

  const branches = branchesData || []

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers()
  })

  const users = usersData?.users || []

  const { data, isLoading, isError } = useQuery({
    queryKey: ['follow-ups', searchQuery, statusFilter, branchFilter, userFilter],
    queryFn: () => getFollowUps({
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      branchId: branchFilter !== 'all' ? branchFilter : undefined,
      userId: userFilter !== 'all' ? userFilter : undefined,
      limit: 1000
    }),
  })

  const followUps = data?.tasks || []
  const activeCount = data?.counts?.active || 0

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      branchFilter !== 'all' ||
      userFilter !== 'all' ||
      sortBy !== 'dueDate-asc' ||
      !!filterParam ||
      !!searchQuery
    );
  }, [statusFilter, branchFilter, userFilter, sortBy, filterParam, searchQuery]);

  const activeFiltersList = useMemo(() => {
    const list = [];
    
    if (filterParam) {
      list.push({
        key: 'filter',
        label: `Timeframe: ${filterParam.charAt(0).toUpperCase() + filterParam.slice(1)}`,
        clear: () => navigate('/follow-ups')
      });
    }
    
    if (sortBy !== 'dueDate-asc') {
      let sortLabel = sortBy;
      if (sortBy === 'dueDate-desc') sortLabel = "Due Date (Latest)";
      else if (sortBy === 'priority-desc') sortLabel = "Priority (High to Low)";
      else if (sortBy === 'assignedTo-asc') sortLabel = "User (A-Z)";
      else if (sortBy === 'status-asc') sortLabel = "Status (A-Z)";
      else if (sortBy === 'subject-asc') sortLabel = "Subject (A-Z)";
      
      list.push({
        key: 'sort',
        label: `Sorting: ${sortLabel}`,
        clear: () => updateSearchParams({ sort: undefined })
      });
    }
    
    if (statusFilter !== 'all') {
      let statusLabel = statusFilter;
      if (statusFilter === 'not_started') statusLabel = "Not Started";
      else if (statusFilter === 'in_progress') statusLabel = "In Progress";
      else if (statusFilter === 'completed') statusLabel = "Completed";
      else if (statusFilter === 'deferred') statusLabel = "Deferred";
      
      list.push({
        key: 'status',
        label: `Status: ${statusLabel}`,
        clear: () => updateSearchParams({ status: undefined })
      });
    }
    
    if (branchFilter !== 'all') {
      const found = branches.find((b: any) => b.id === branchFilter);
      const label = found ? `Branch: ${found.name}` : `Branch: ${branchFilter}`;
      list.push({
        key: 'branch',
        label,
        clear: () => updateSearchParams({ branch: undefined })
      });
    }
    
    if (userFilter !== 'all') {
      const found = users.find((u: any) => u.id === userFilter);
      const label = found ? `User: ${found.firstName} ${found.lastName || ''}` : `User: ${userFilter}`;
      list.push({
        key: 'user',
        label,
        clear: () => updateSearchParams({ user: undefined })
      });
    }
    
    return list;
  }, [filterParam, sortBy, statusFilter, branchFilter, userFilter, branches, users, updateSearchParams, navigate]);

  const handleClearAllFilters = () => {
    sessionStorage.removeItem('last-followups-filters');
    setSearchQuery("");
    setSearchParams(new URLSearchParams({}));
    navigate('/follow-ups');
  };

  // Calculate stats and filter data based on URL parameter
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filteredFollowUps = useMemo(() => {
    let result = filterParam ? followUps.filter((task: any) => {
      const dueDate = new Date(task.dueDate)
      dueDate.setHours(0, 0, 0, 0)

      switch (filterParam) {
        case 'overdue':
          return new Date(task.dueDate) < new Date() && task.status !== 'completed'
        case 'today':
          return isToday(new Date(task.dueDate)) && task.status !== 'completed'
        case 'upcoming':
          return new Date(task.dueDate) > new Date() && !isToday(new Date(task.dueDate)) && task.status !== 'completed'
        default:
          return true
      }
    }) : (statusFilter === 'all' ? followUps.filter((task: any) => task.status !== 'completed') : [...followUps])

    // Apply Sorting
    const [field, direction] = sortBy.split('-')
    result.sort((a: any, b: any) => {
      let valA = a[field]
      let valB = b[field]

      // Handle date objects
      if (field === 'dueDate') {
        valA = new Date(valA).getTime()
        valB = new Date(valB).getTime()
      }

      // Handle user name sorting
      if (field === 'assignedTo') {
        valA = a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : ''
        valB = b.assignedTo ? `${b.assignedTo.firstName} ${b.assignedTo.lastName}` : ''
      }

      if (valA < valB) return direction === 'asc' ? -1 : 1
      if (valA > valB) return direction === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [followUps, filterParam, today, sortBy, statusFilter])

  const overdueCount = data?.counts?.overdue || 0
  const todayCount = data?.counts?.today || 0
  const upcomingCount = data?.counts?.upcoming || 0

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">Error loading follow-ups. Please try again.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Follow-ups</h1>
          <p className="text-muted-foreground mt-1">Track and manage all your follow-up tasks and your team's.</p>
        </div>
        <Button
          variant="outline"
          onClick={handleClearAllFilters}
          className={`h-11 px-4 rounded-xl border-dashed bg-background/50 backdrop-blur-sm gap-2 font-semibold text-xs transition-all ${
            hasActiveFilters 
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 active:scale-95",
            !filterParam && "ring-2 ring-primary bg-primary/5"
          )}
          onClick={() => navigate('/follow-ups')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Follow-ups</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">All pending follow-ups</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 active:scale-95 border-red-200 bg-red-50/50",
            filterParam === 'overdue' && "ring-2 ring-red-500 bg-red-100/50"
          )}
          onClick={() => navigate('/follow-ups?filter=overdue')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
            <p className="text-xs text-red-600">Past due date</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 active:scale-95 border-orange-200 bg-orange-50/50",
            filterParam === 'today' && "ring-2 ring-orange-500 bg-orange-100/50"
          )}
          onClick={() => navigate('/follow-ups?filter=today')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Today</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{todayCount}</div>
            <p className="text-xs text-orange-600">Due today</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md hover:-translate-y-1 active:scale-95 border-blue-200 bg-blue-50/50",
            filterParam === 'upcoming' && "ring-2 ring-blue-500 bg-blue-100/50"
          )}
          onClick={() => navigate('/follow-ups?filter=upcoming')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{upcomingCount}</div>
            <p className="text-xs text-blue-600">Future follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search follow-ups..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10 h-9 w-full bg-background"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <Select value={sortBy} onValueChange={(val) => updateSearchParams({ sort: val })}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 shadow-sm">
              <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate-asc">Due Date (Earliest)</SelectItem>
              <SelectItem value="dueDate-desc">Due Date (Latest)</SelectItem>
              <SelectItem value="priority-desc">Priority (High to Low)</SelectItem>
              <SelectItem value="assignedTo-asc">User (A-Z)</SelectItem>
              <SelectItem value="status-asc">Status (A-Z)</SelectItem>
              <SelectItem value="subject-asc">Subject (A-Z)</SelectItem>
            </SelectContent>
          </Select>
 
          <Select value={statusFilter} onValueChange={(val) => updateSearchParams({ status: val })}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 shadow-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
 
          {branches.length > 0 && (
            <Select value={branchFilter} onValueChange={(val) => updateSearchParams({ branch: val })}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 shadow-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="Branch" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
 
          {users.length > 0 && (
            <Select value={userFilter} onValueChange={(val) => updateSearchParams({ user: val })}>
              <SelectTrigger className="w-full sm:w-[150px] h-9 shadow-sm">
                <div className="flex items-center gap-2">
                  <User2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <SelectValue placeholder="User" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredFollowUps}
          initialPageSize={100}
        />
      )}
    </div>
  )
}
