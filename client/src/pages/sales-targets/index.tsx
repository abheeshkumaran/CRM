import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyTargets,
  getTeamTargets,
  getSubordinates,
  assignTarget,
  deleteTarget,
  updateTarget,
  recalculateProgress,
  type SalesTarget,
  type Subordinate,
  type AssignTargetInput,
  type UpdateTargetInput
} from "@/services/salesTargetService"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Plus,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Calendar,
  MoreVertical,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Pencil,
  Box
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/CurrencyContext"

// Tree Node interface for hierarchical display
interface TargetTreeNode extends SalesTarget {
  children: TargetTreeNode[];
}

// Build tree from flat targets list
const buildTargetTree = (targets: SalesTarget[]): TargetTreeNode[] => {
  const targetMap = new Map<string, TargetTreeNode>();
  const roots: TargetTreeNode[] = [];

  // Initialize map
  targets.forEach(target => {
    targetMap.set(target.id, { ...target, children: [] });
  });

  // Build hierarchy
  targets.forEach(target => {
    const node = targetMap.get(target.id)!;
    if (target.parentTarget && targetMap.has(target.parentTarget)) {
      const parent = targetMap.get(target.parentTarget)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

// Target Tree Node Component
const TargetNode = ({ node, level = 0, onDelete, onEdit }: { node: TargetTreeNode; level?: number; onDelete: (id: string) => void; onEdit: (target: SalesTarget) => void }) => {
  const { formatCurrency } = useCurrency();
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const achievementPercent = node.targetValue > 0
    ? Math.round((node.achievedValue / node.targetValue) * 100)
    : 0;

  return (
    <div className={`${level > 0 ? 'ml-8 border-l-2 border-dashed border-border pl-4' : ''}`}>
      <div className="p-4 rounded-xl border bg-card hover:shadow-md transition-all mb-3 text-card-foreground">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${node.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{node.assignedTo.firstName} {node.assignedTo.lastName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {node.autoDistributed && <Badge variant="outline" className="text-xs">Auto-distributed</Badge>}
                <Badge variant={node.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                  {node.status}
                </Badge>
                {node.product && (
                  <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1">
                    <Box className="h-3 w-3" />
                    {node.product.name}
                  </Badge>
                )}
                {node.opportunityType && (
                  <Badge variant="outline" className="text-xs border-purple-200 bg-purple-50 text-purple-700">
                    {node.opportunityType.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">
                {node.metric === 'units' 
                  ? node.achievedValue.toLocaleString() 
                  : formatCurrency(node.achievedValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                <span className="text-muted-foreground font-normal">/</span> 
                {node.metric === 'units' 
                  ? ` ${node.targetValue.toLocaleString()} units` 
                  : ` ${formatCurrency(node.targetValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              </p>
              <p className="text-sm text-muted-foreground">{achievementPercent}% achieved</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(node)}>
                  <Pencil className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => onDelete(node.id)}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Progress value={Math.min(achievementPercent, 100)} className="h-2" />
      </div>

      {hasChildren && expanded && (
        <div className="mt-2">
          {node.children.map(child => (
            <TargetNode key={child.id} node={child} level={level + 1} onDelete={onDelete} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function SalesTargetsPage() {
  const { formatCurrency } = useCurrency()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedSubordinate, setSelectedSubordinate] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [period, setPeriod] = useState<"monthly" | "quarterly" | "yearly">("monthly")

  // New State for Enhanced Targeting
  const [metric, setMetric] = useState<'revenue' | 'units'>('revenue')
  const [scope, setScope] = useState<'INDIVIDUAL' | 'HIERARCHY'>('HIERARCHY')
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL')
  const [opportunityType, setOpportunityType] = useState<'NEW_BUSINESS' | 'UPSALE' | 'ALL'>('ALL')

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null)
  const [editValue, setEditValue] = useState("")

  const queryClient = useQueryClient()

  // Fetch Products for dropdown
  // Assuming we can use /api/products directly or need a service method.
  // Using inline fetch or similar approach to previous files
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      // We need to import api here or use existing pattern. 
      // To avoid import issues, I will try to use the api imported in other files if available,
      // but index.tsx doesn't import 'api'.
      // I'll assume 'api' can be imported from @/services/api
      const { api } = await import('@/services/api')
      return (await api.get('/products?limit=1000')).data
    }
  })
  const products = Array.isArray(productsData) ? productsData : []

  const { data: myTargetsData, isLoading: isLoadingMy } = useQuery({
    queryKey: ['sales-targets', 'my'],
    queryFn: getMyTargets
  })

  const { data: teamTargetsData, isLoading: isLoadingTeam } = useQuery({
    queryKey: ['sales-targets', 'team'],
    queryFn: getTeamTargets
  })

  const { data: subordinatesData } = useQuery({
    queryKey: ['sales-targets', 'subordinates'],
    queryFn: getSubordinates
  })

  const myTargets = Array.isArray(myTargetsData?.targets) ? myTargetsData.targets : []
  const teamTargets = Array.isArray(teamTargetsData?.targets) ? teamTargetsData.targets : []
  const subordinates = Array.isArray(subordinatesData?.subordinates) ? subordinatesData.subordinates : []

  const targetTree = useMemo(() => {
    const targets = Array.isArray(teamTargetsData?.targets) ? teamTargetsData.targets : [];
    return buildTargetTree(targets);
  }, [teamTargetsData?.targets]);

  const [now] = useState<number>(() => Date.now()); // Fallback to current time, but useState initializer is only once per mount

  const assignMutation = useMutation({
    mutationFn: (data: AssignTargetInput) => assignTarget(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] })
      setIsDialogOpen(false)
      setSelectedSubordinate("")
      setTargetValue("")
      toast.success("Target assigned successfully! Subordinates have been auto-distributed their targets.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign target")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTarget(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] })
      toast.success("Target deleted")
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTargetInput }) => updateTarget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] })
      setIsEditOpen(false)
      setEditingTarget(null)
      toast.success("Target updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update target")
    }
  })

  const recalcMutation = useMutation({
    mutationFn: recalculateProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-targets'] })
      toast.success("Progress recalculated from closed opportunities")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubordinate || !targetValue) return

    assignMutation.mutate({
      assignToUserId: selectedSubordinate,
      targetValue: parseFloat(targetValue),
      period,
      metric,
      scope,
      productId: selectedProductId === 'ALL' ? undefined : selectedProductId,
      opportunityType: opportunityType === 'ALL' ? undefined : opportunityType
    })
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTarget || !editValue) return

    updateMutation.mutate({
      id: editingTarget.id,
      data: {
        targetValue: parseFloat(editValue)
      }
    })
  }

  const openEditDialog = (target: SalesTarget) => {
    setEditingTarget(target)
    setEditValue(target.targetValue.toString())
    setIsEditOpen(true)
  }

  // Stats (Summing only revenue targets to prevent mixing metrics)
  const revenueTargets = myTargets.filter(t => t.metric !== 'units')
  const totalTargetValue = revenueTargets.reduce((sum, t) => sum + t.targetValue, 0)
  const totalAchieved = revenueTargets.reduce((sum, t) => sum + t.achievedValue, 0)
  const completedCount = teamTargets.filter(t => t.status === 'completed').length
  const activeCount = teamTargets.filter(t => t.status === 'active').length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Sales Targets
                </h1>
                <p className="text-muted-foreground">Manage hierarchical sales targets for your team</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => recalcMutation.mutate()}
                  disabled={recalcMutation.isPending}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${recalcMutation.isPending ? 'animate-spin' : ''}`} />
                  Recalculate
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="shadow-lg shadow-primary/25">
                      <Plus className="h-4 w-4 mr-2" />Assign Target
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="assign-target-desc">
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>Assign Sales Target</DialogTitle>
                        <DialogDescription id="assign-target-desc">
                          Assign a sales target to a subordinate for a specific period.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label>Assign To</Label>
                          <Select value={selectedSubordinate} onValueChange={setSelectedSubordinate}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team member" />
                            </SelectTrigger>
                            <SelectContent>
                              {subordinates.map((sub: Subordinate) => (
                                <SelectItem key={sub.id} value={sub.id}>
                                  {sub.firstName} {sub.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {subordinates.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              No direct reports found. You can only assign targets to your subordinates.
                            </p>
                          )}
                        </div>
                        <div>
                          <Label>Measure By</Label>
                          <Select value={metric} onValueChange={(v) => setMetric(v as 'revenue' | 'units')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="revenue">Revenue Amount</SelectItem>
                              <SelectItem value="units">Product Units (Qty)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Target Scope</Label>
                          <Select value={scope} onValueChange={(v) => setScope(v as 'INDIVIDUAL' | 'HIERARCHY')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HIERARCHY">Team Hierarchy (Rollup)</SelectItem>
                              <SelectItem value="INDIVIDUAL">Individual Only</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {scope === 'HIERARCHY'
                              ? "Target includes sales from the user + their team."
                              : "Target counts ONLY the user's personal sales."}
                          </p>
                        </div>

                        <div>
                          <Label>Product (Optional)</Label>
                          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Products (General Target)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Products (General Target)</SelectItem>
                              {products.map((product: { id: string; name: string }) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>Opportunity Type (Optional)</Label>
                          <Select value={opportunityType} onValueChange={(v) => setOpportunityType(v as 'NEW_BUSINESS' | 'UPSALE' | 'ALL')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All Types</SelectItem>
                              <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                              <SelectItem value="UPSALE">Upsale</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>{metric === 'revenue' ? 'Target Amount' : 'Target Units (Qty)'}</Label>
                          <Input
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            placeholder={metric === 'revenue' ? "e.g. 100000" : "e.g. 50"}
                            required
                          />
                        </div>
                        <div>
                          <Label>Period</Label>
                          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                          <strong>Note:</strong> If the selected person has subordinates, the target will be automatically split equally among them.
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={assignMutation.isPending || !selectedSubordinate}>
                          {assignMutation.isPending ? "Assigning..." : "Assign Target"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent>
                    <form onSubmit={handleEditSubmit}>
                      <DialogHeader>
                        <DialogTitle>Edit Sales Target</DialogTitle>
                        <DialogDescription>
                          Update the target value. Period and assignee cannot be changed here.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label>Target Amount</Label>
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="e.g. 100000"
                            required
                          />
                        </div>
                        {editingTarget?.product && (
                          <div className="text-sm text-gray-500">
                            Product: <span className="font-medium text-gray-900 dark:text-gray-100">{editingTarget.product.name}</span>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? "Updating..." : "Update Target"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalTargetValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">My Total Target</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalAchieved, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-muted-foreground">My Achieved</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                    <p className="text-xs text-muted-foreground">Team Completed</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active Targets</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for My Targets and Team View */}
            <Tabs defaultValue="my" className="w-full">
              <TabsList>
                <TabsTrigger value="my">My Targets</TabsTrigger>
                <TabsTrigger value="team">Team Hierarchy</TabsTrigger>
              </TabsList>

              <TabsContent value="my">
                <Card>
                  <CardHeader>
                    <CardTitle>My Sales Targets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingMy ? (
                      <div className="flex justify-center p-12">
                        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                      </div>
                    ) : myTargets.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No targets assigned to you yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {myTargets.map((target: SalesTarget) => {
                          const percent = target.targetValue > 0
                            ? Math.round((target.achievedValue / target.targetValue) * 100)
                            : 0;
                          const daysLeft = Math.ceil((new Date(target.endDate).getTime() - now) / (1000 * 60 * 60 * 24));

                          return (
                            <div key={target.id} className="p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${target.status === 'completed' ? 'bg-green-500/10 text-green-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                    {target.status === 'completed' ? <Trophy className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                                  </div>
                                  <div>
                                    <p className="font-semibold capitalize text-foreground">{target.period} Target</p>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Badge variant="outline">{target.period}</Badge>
                                      <Calendar className="h-3 w-3" />
                                      <span>{daysLeft > 0 ? `${daysLeft} days left` : 'Ended'}</span>
                                    </div>
                                    {target.product && (
                                      <Badge variant="outline" className="mt-1 text-xs border-blue-200 bg-blue-50 text-blue-700 flex items-center gap-1 w-fit">
                                        <Box className="h-3 w-3" />
                                        {target.product.name}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-bold text-lg text-foreground">
                                      {target.metric === 'units' 
                                        ? target.achievedValue.toLocaleString() 
                                        : formatCurrency(target.achievedValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} 
                                      <span className="text-muted-foreground font-normal"> / </span> 
                                      {target.metric === 'units' 
                                        ? `${target.targetValue.toLocaleString()} units` 
                                        : formatCurrency(target.targetValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{percent}% achieved</p>
                                  </div>
                                  {/* Note: Employees can't usually edit their own targets assigned by managers, blocking edit here for 'My Targets' view unless we want self-assigned targets logic. Assuming 'Team' view is where management happens. */}
                                </div>
                              </div>
                              <Progress value={Math.min(percent, 100)} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="team">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Target Hierarchy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTeam ? (
                      <div className="flex justify-center p-12">
                        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
                      </div>
                    ) : targetTree.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No team targets yet</p>
                        <p className="text-sm mt-1">Assign targets to your subordinates to see the hierarchy</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {targetTree.map(node => (
                          <TargetNode
                            key={node.id}
                            node={node}
                            onDelete={(id) => deleteMutation.mutate(id)}
                            onEdit={openEditDialog}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
