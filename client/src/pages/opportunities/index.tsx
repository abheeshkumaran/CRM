import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/ui/data-table"
import { cn } from "@/lib/utils"
import { createOpportunityColumns } from "./columns"
import { getOpportunities } from "@/services/opportunityService"
import { Button } from "@/components/ui/button"
import { KanbanBoard } from "./KanbanBoard"
import { useCurrency } from "@/contexts/CurrencyContext"

import {
  Target,
  Filter,
  Download,
  LayoutList,
  LayoutGrid,
  Users,
  User
} from "lucide-react"

import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { CreateOpportunityDialog } from "@/components/CreateOpportunityDialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { getUsers, getBranches } from "@/services/settingsService"

export default function OpportunitiesPage() {
  const { formatCurrency } = useCurrency()
  const columns = createOpportunityColumns(formatCurrency)
  const [searchParams] = useSearchParams()

  // Parse query params
  const initialStage = searchParams.get('stage') as any
  const initialView = searchParams.get('view') as 'list' | 'board'

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'board'>(initialView || 'board')
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all')
  const [queryParams, setQueryParams] = useState({
    ownerId: '',
    stage: initialStage || 'all',
    type: 'all',
    branchId: 'all',
    leadSource: 'all',
    search: ''
  })

  // Get current user
  const userInfo = localStorage.getItem('userInfo');
  const currentUser = userInfo ? JSON.parse(userInfo) : null;

  // Users for Owner Filter
  const { data: userData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => getUsers(),
  });
  const users = userData?.users || [];

  // Branches for Filter
  const { data: branchData } = useQuery({
    queryKey: ['branches', 'list'],
    queryFn: () => getBranches(),
  });
  const branches = branchData || [];

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['opportunities', queryParams, filterMode],
    queryFn: () => {
      const params: any = { ...queryParams };
      if (filterMode === 'mine' && currentUser) {
        params.ownerId = currentUser.id || currentUser._id;
      }
      if (params.stage === 'all') delete params.stage;
      if (params.type === 'all') delete params.type;
      if (params.branchId === 'all') delete params.branchId;
      if (params.leadSource === 'all') delete params.leadSource;
      if (params.ownerId === '') delete params.ownerId;

      return getOpportunities(params);
    },
    refetchInterval: 5000,
  })

  const allOpportunities = data?.opportunities || []

  // Logic for local filtering if needed (though backend handles most now)
  const filteredOpportunities = allOpportunities;

  const handleFilterChange = (key: string, value: string) => {
    setQueryParams(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setQueryParams({
      ownerId: '',
      stage: 'all',
      type: 'all',
      branchId: 'all',
      leadSource: 'all',
      search: ''
    });
    setFilterMode('all');
  };

  return (
    <div className="h-full flex flex-col bg-background/50">
      <div className="flex-none p-6 pb-2">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Opportunities</h1>
          <p className="text-muted-foreground mt-1">Track your deals and sales pipeline.</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="flex bg-muted p-1 rounded-xl mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterMode('all');
                  handleFilterChange('ownerId', '');
                }}
                className={`rounded-lg h-8 px-2 text-xs font-medium transition-all ${filterMode === 'all' && !queryParams.ownerId ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Team
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterMode('mine')}
                className={`rounded-lg h-8 px-2 text-xs font-medium transition-all ${filterMode === 'mine' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                My Deals
              </Button>
            </div>

            <div className="flex bg-muted p-1 rounded-xl mr-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  "rounded-lg h-8 px-2 transition-all",
                  viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('board')}
                className={cn(
                  "rounded-lg h-8 px-2 transition-all",
                  viewMode === 'board' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("rounded-xl transition-all", (queryParams.ownerId || queryParams.stage !== 'all' || queryParams.type !== 'all' || queryParams.branchId !== 'all') ? 'border-primary text-primary bg-primary/5' : '')}>
                  <Filter className="h-4 w-4" />
                  <span className="ml-2 hidden xs:inline">Filter</span>
                  {(queryParams.ownerId || queryParams.stage !== 'all' || queryParams.type !== 'all' || queryParams.branchId !== 'all' || queryParams.leadSource !== 'all') && (
                    <Badge className="ml-2 h-4 w-4 p-0 flex items-center justify-center bg-primary text-white text-[10px] rounded-full">
                      !
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 rounded-2xl shadow-2xl border-border/50" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm">Filters</h4>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/5">
                      Reset
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sales Owner</label>
                    <Select value={queryParams.ownerId || 'all'} onValueChange={(v) => handleFilterChange('ownerId', v === 'all' ? '' : v)}>
                      <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-0">
                        <SelectValue placeholder="All Owners" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Owners</SelectItem>
                        {users.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal Stage</label>
                    <Select value={queryParams.stage} onValueChange={(v) => handleFilterChange('stage', v)}>
                      <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-0">
                        <SelectValue placeholder="All Stages" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Stages</SelectItem>
                        <SelectItem value="expected">Expected</SelectItem>
                        <SelectItem value="closed_won">Closed Won</SelectItem>
                        <SelectItem value="closed_lost">Closed Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deal Type</label>
                    <Select value={queryParams.type} onValueChange={(v) => handleFilterChange('type', v)}>
                      <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-0">
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                        <SelectItem value="UPSALE">Upsale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Branch</label>
                    <Select value={queryParams.branchId} onValueChange={(v) => handleFilterChange('branchId', v)}>
                      <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-0">
                        <SelectValue placeholder="All Branches" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source</label>
                    <Select value={queryParams.leadSource} onValueChange={(v) => handleFilterChange('leadSource', v)}>
                      <SelectTrigger className="h-9 rounded-lg bg-muted/50 border-0">
                        <SelectValue placeholder="All Sources" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social">Social</SelectItem>
                        <SelectItem value="paid_ad">Paid Ad</SelectItem>
                        <SelectItem value="import">Import</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="meta_leadgen">Meta Ads</SelectItem>
                        <SelectItem value="cold_call">Cold Call</SelectItem>
                        <SelectItem value="email_campaign">Email Campaign</SelectItem>
                        <SelectItem value="meta_ads">Meta Ads</SelectItem>
                        <SelectItem value="google_ads">Google Ads</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="rounded-xl flex">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 rounded-xl">
              <Target className="sm:mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Create Opportunity</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading opportunities...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="text-red-500 mb-4">
            {(error as any)?.response?.data?.message || (error as Error)?.message || "Error loading opportunities. Please try again."}
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className={`flex-1 min-h-0 p-6 pt-2 ${viewMode === 'list' ? 'overflow-auto' : 'overflow-hidden'}`}>
          <div className={viewMode === 'list' ? "rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden" : "h-full"}>
            {viewMode === 'list' ? (
              <DataTable columns={columns} data={filteredOpportunities} searchKeys={["name", "stage", "description"]} />
            ) : (
              <KanbanBoard opportunities={filteredOpportunities} />
            )}
          </div>
        </div>
      )}
      <CreateOpportunityDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}
