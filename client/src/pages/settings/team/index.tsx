import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Pencil, Mail, Shield, Search, Building, LayoutList, Network, ChevronRight, ChevronDown, User as UserIcon, MoreVertical, UserX, UserCheck, Download, FileSpreadsheet, Trash2, Key } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { isSuperAdmin, getUserInfo, isAdmin } from "@/lib/utils"

interface TeamMember {
  id: string
  firstName: string
  lastName: string
  email: string
  role: {
    id: string
    name: string
  }
  position?: string
  phone?: string
  avatar?: string
  isActive: boolean
  isOffDuty?: boolean
  dailyLeadQuota?: number
  permissions?: string[]
  reportsTo?: {
    id: string
    firstName: string
    lastName: string
  }
  branch?: {
    id: string
    name: string
  }
}

// ─── Tree helpers ────────────────────────────────────────────────────
interface TreeNode {
  user: TeamMember
  children: TreeNode[]
}

function buildHierarchyTree(members: TeamMember[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  members.forEach(m => map.set(m.id, { user: m, children: [] }))

  const roots: TreeNode[] = []
  members.forEach(m => {
    const node = map.get(m.id)!
    if (m.reportsTo && map.has(m.reportsTo.id)) {
      map.get(m.reportsTo.id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

// ─── Tree Row Component ──────────────────────────────────────────────
interface HierarchyNodeProps {
  node: TreeNode
  depth: number
  onEdit: (m: TeamMember) => void
  onSuspend: (m: TeamMember) => void
  onActivate: (m: TeamMember) => void
  onDelete: (m: TeamMember) => void
  onToggleDuty?: (m: TeamMember, isOffDuty: boolean) => void
  onSaveQuota?: (m: TeamMember, quota: number | null) => void
  onResetPassword?: (m: TeamMember) => void
}

function HierarchyNode({
  node,
  depth,
  onEdit,
  onSuspend,
  onActivate,
  onDelete,
  onToggleDuty,
  onSaveQuota,
  onResetPassword,
}: HierarchyNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const m = node.user
  const hasChildren = node.children.length > 0

  return (
    <>
      <div
        className="flex items-center gap-2 py-2.5 px-3 hover:bg-muted/50 transition-colors rounded-lg group"
        style={{ paddingLeft: `${12 + depth * 28}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${hasChildren ? 'hover:bg-muted text-muted-foreground' : 'invisible'}`}
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren && (expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
        </button>

        {/* Avatar */}
        <Avatar className={`h-8 w-8 ${!m.isActive ? 'grayscale' : ''}`}>
          <AvatarImage src={m.avatar} />
          <AvatarFallback className="text-xs">{m.firstName[0]}{m.lastName[0]}</AvatarFallback>
        </Avatar>

        {/* Name + details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground truncate">{m.firstName} {m.lastName}</span>
            <Badge variant="outline" className="text-[10px] capitalize font-normal">
              {m.role.name.replace('_', ' ')}
            </Badge>
            {m.branch && (
              <Badge variant="secondary" className="text-[10px] font-normal gap-1">
                <Building className="h-2.5 w-2.5" />
                {m.branch.name}
              </Badge>
            )}
            {!m.isActive && (
              <Badge variant="destructive" className="h-[18px] px-1 text-[9px] uppercase font-bold tracking-tighter">
                Suspended
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>
            {m.position && <span>· {m.position}</span>}
            {hasChildren && (
              <span className="text-muted-foreground/60">· {node.children.length} report{node.children.length > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Quota Editor & Duty Toggle */}
        <div className="flex items-center gap-4 mr-4">
          {onSaveQuota && m.isActive && (
            <div onClick={e => e.stopPropagation()}>
              <QuotaEditor member={m} onSave={(val) => onSaveQuota(m, val)} />
            </div>
          )}

          {/* Duty Toggle (Admin only) */}
          {onToggleDuty && m.isActive && (
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <span className={m.isOffDuty ? "text-[10px] text-destructive font-semibold" : "text-[10px] text-emerald-500 font-semibold"}>
                {m.isOffDuty ? "Off Duty" : "On Duty"}
              </span>
              <Switch
                checked={!m.isOffDuty}
                onCheckedChange={(checked) => onToggleDuty(m, !checked)}
                className="scale-75 data-[state=checked]:bg-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(m)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {m.isActive ? (
              <DropdownMenuItem
                onClick={() => onSuspend(m)}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="h-4 w-4 mr-2" />
                Suspend User
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => onActivate(m)}
                className="text-green-600 focus:text-green-600"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Activate User
              </DropdownMenuItem>
            )}
            {!m.isActive && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(m)}
                  className="text-destructive focus:text-destructive font-semibold"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </DropdownMenuItem>
              </>
            )}
            {onResetPassword && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onResetPassword(m)}>
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children */}
      {expanded && node.children.length > 0 && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-border/50"
            style={{ left: `${26 + depth * 28}px` }}
          />
          {node.children.map(child => (
            <HierarchyNode key={child.user.id} node={child} depth={depth + 1} onEdit={onEdit} onSuspend={onSuspend} onActivate={onActivate} onDelete={onDelete} onToggleDuty={onToggleDuty} onSaveQuota={onSaveQuota} onResetPassword={onResetPassword} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Inline Quota Editor ──────────────────────────────────────────────
const QuotaEditor = ({ member, onSave }: { member: TeamMember, onSave: (val: number | null) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(member.dailyLeadQuota?.toString() || '');

  const save = () => {
    setIsEditing(false);
    const num = parseInt(val);
    const newVal = isNaN(num) || num <= 0 ? null : num;
    if (newVal !== member.dailyLeadQuota) {
      onSave(newVal);
    }
  };

  if (isEditing) {
    return (
      <Input
        autoFocus
        type="number"
        className="w-24 h-7 text-xs px-2"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="No limit"
      />
    );
  }

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
      className="group cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1.5 w-fit"
      title="Click to edit quota"
    >
      {member.dailyLeadQuota ? (
        <Badge variant="outline" className="font-normal capitalize whitespace-nowrap bg-muted/20 hover:bg-muted/40 transition-colors">
          {member.dailyLeadQuota} leads/day
        </Badge>
      ) : (
        <span className="text-muted-foreground text-xs underline decoration-dashed underline-offset-2 hover:text-foreground transition-colors">No limit</span>
      )}
      <Pencil className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────
export default function TeamSettings() {
  const currentUser = getUserInfo()
  const userIsSuperAdmin = isSuperAdmin(currentUser)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [canCreateSubordinates, setCanCreateSubordinates] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('tree')
  const [suspendingUser, setSuspendingUser] = useState<TeamMember | null>(null)
  const [activatingUser, setActivatingUser] = useState<TeamMember | null>(null)
  const [deletingUser, setDeletingUser] = useState<TeamMember | null>(null)
  const [resettingUser, setResettingUser] = useState<TeamMember | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [moveBack, setMoveBack] = useState(true)
  const queryClient = useQueryClient()

  const { data: userData, isLoading } = useQuery({
    queryKey: ['users', 'includeInactive'],
    queryFn: async () => {
      const res = await api.get('/users?includeInactive=true')
      return res.data
    }
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles')
      return res.data
    }
  })

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data;
    }
  });

  const members = userData?.users || []

  const filteredMembers = members.filter((member: TeamMember) =>
    member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const hierarchyTree = useMemo(() => buildHierarchyTree(filteredMembers), [filteredMembers])

  const inviteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/users/invite', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success("Team member invited successfully")
      setIsInviteOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to invite team member")
    }
  })

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put(`/users/${editingMember?.id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success("Team member updated successfully")
      setIsInviteOpen(false)
      setEditingMember(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update team member")
    }
  })

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/users/${userId}/deactivate`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success("User suspended successfully")
      setSuspendingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to suspend user")
    }
  })

  const activateMutation = useMutation({
    mutationFn: async ({ userId, moveBack }: { userId: string, moveBack: boolean }) => {
      const res = await api.post(`/users/${userId}/activate`, { moveBack })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success("User activated successfully")
      setActivatingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to activate user")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.delete(`/users/${userId}`)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      queryClient.invalidateQueries({ queryKey: ['trash'] })
      toast.success("User permanently deleted")
      setDeletingUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete user")
    }
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/super-admin/users/reset-password', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setResettingUser(null);
      setResetPassword("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  });

  const toggleDutyMutation = useMutation({
    mutationFn: async ({ userId, isOffDuty }: { userId: string, isOffDuty: boolean }) => {
      const res = await api.put(`/users/${userId}`, { isOffDuty })
      return res.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success(variables.isOffDuty ? "User marked as Off Duty" : "User marked as On Duty")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update duty status")
    }
  });

  const updateQuotaMutation = useMutation({
    mutationFn: async ({ userId, dailyLeadQuota }: { userId: string, dailyLeadQuota: number | null }) => {
      const res = await api.put(`/users/${userId}`, { dailyLeadQuota })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', 'includeInactive'] })
      toast.success("Daily quota updated successfully")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update daily quota")
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: any = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone'),
      password: formData.get('password'),
      role: formData.get('role'),
      position: formData.get('position'),
      branchId: formData.get('branchId') === 'none' ? null : formData.get('branchId'),
      reportsTo: formData.get('reportsTo') === 'none' ? null : formData.get('reportsTo'),
      dailyLeadQuota: formData.get('dailyLeadQuota') ? parseInt(formData.get('dailyLeadQuota') as string) : null,
      permissions: canCreateSubordinates ? ['users:create:subordinates'] : []
    }

    const email = formData.get('email')
    if (email) {
      data.email = email
    }

    if (editingMember) {
      updateMutation.mutate(data)
    } else {
      inviteMutation.mutate(data)
    }
  }

  const openEdit = (member: TeamMember) => {
    setEditingMember(member)
    setCanCreateSubordinates(member.permissions?.includes('users:create:subordinates') || false)
    setIsInviteOpen(true)
  }

  const openInvite = () => {
    setEditingMember(null)
    setCanCreateSubordinates(false)
    setIsInviteOpen(true)
  }

  const handleExportCSV = () => {
    if (!members || members.length === 0) {
      toast.error("No team members to export");
      return;
    }

    const headers = ["First Name", "Last Name", "Email", "Phone", "Role", "Position", "Branch", "Manager", "Status"];
    const csvRows = [headers.join(",")];

    members.forEach((m: TeamMember) => {
      const row = [
        `"${m.firstName || ''}"`,
        `"${m.lastName || ''}"`,
        `"${m.email || ''}"`,
        `"${m.phone || ''}"`,
        `"${m.role?.name?.replace('_', ' ') || ''}"`,
        `"${m.position || ''}"`,
        `"${m.branch?.name || ''}"`,
        `"${m.reportsTo ? `${m.reportsTo.firstName} ${m.reportsTo.lastName}` : ''}"`,
        `"${m.isActive ? 'Active' : 'Suspended'}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `team_members_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-foreground">Team Members</h3>
          <p className="text-sm text-muted-foreground">
            Manage your team, assign roles, and control access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutList className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${viewMode === 'tree' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <Network className="h-3.5 w-3.5" /> Hierarchy
            </button>
          </div>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download List
          </Button>
          {(userIsSuperAdmin || isAdmin(currentUser) || currentUser?.permissions?.includes('users:create:subordinates')) && (
            <Button onClick={openInvite} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Table View ─────────────────────────────────── */}
      {viewMode === 'table' && (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Daily Quota</TableHead>
                {(userIsSuperAdmin || isAdmin(currentUser)) && <TableHead>Duty Status</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading team members...
                  </TableCell>
                </TableRow>
              ) : filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No team members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member: TeamMember) => (
                  <TableRow key={member.id} className={!member.isActive ? 'bg-muted/30 opacity-80' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-8 w-8 ${!member.isActive ? 'grayscale' : ''}`}>
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback>{member.firstName[0]}{member.lastName[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 font-medium text-foreground">
                            {member.firstName} {member.lastName}
                            {!member.isActive && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase">
                                Suspended
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                          {member.position && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {member.position}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize">{member.role.name.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.branch ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="h-3 w-3 text-muted-foreground" />
                          {member.branch.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.reportsTo ? (
                        <div className="flex items-center gap-2 text-sm">
                          <UserIcon className="h-3 w-3 text-muted-foreground" />
                          {member.reportsTo.firstName} {member.reportsTo.lastName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(userIsSuperAdmin || isAdmin(currentUser)) ? (
                        <QuotaEditor member={member} onSave={(val) => updateQuotaMutation.mutate({ userId: member.id, dailyLeadQuota: val })} />
                      ) : member.dailyLeadQuota ? (
                        <Badge variant="outline" className="font-normal capitalize whitespace-nowrap">
                          {member.dailyLeadQuota} leads/day
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No limit</span>
                      )}
                    </TableCell>
                    {(userIsSuperAdmin || isAdmin(currentUser)) && (
                      <TableCell>
                        {member.isActive ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Switch
                              checked={!member.isOffDuty}
                              onCheckedChange={(checked) => toggleDutyMutation.mutate({ userId: member.id, isOffDuty: !checked })}
                              className="scale-75 data-[state=checked]:bg-emerald-500"
                            />
                            <span className={member.isOffDuty ? "text-[10px] text-destructive font-semibold" : "text-[10px] text-emerald-500 font-semibold"}>
                              {member.isOffDuty ? "Off Duty" : "On Duty"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={member.isActive ? "default" : "secondary"}
                        className={member.isActive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-0"
                          : "bg-red-500/15 text-red-600 dark:text-red-400 border-0"
                        }
                      >
                        {member.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(member)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.isActive ? (
                              <DropdownMenuItem
                                onClick={() => setSuspendingUser(member)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => setActivatingUser(member)}
                                className="text-green-600 focus:text-green-600"
                              >
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                            {!member.isActive && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeletingUser(member)}
                                  className="text-destructive focus:text-destructive font-semibold"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                            {userIsSuperAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setResettingUser(member)}>
                                  <Key className="h-4 w-4 mr-2" />
                                  Reset Password
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Tree / Hierarchy View ──────────────────────── */}
      {viewMode === 'tree' && (
        <div className="rounded-md border border-border bg-card p-2">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading hierarchy...</div>
          ) : hierarchyTree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No team members found.</div>
          ) : (
            <div className="space-y-0.5">
              {hierarchyTree.map(node => (
                <HierarchyNode
                  key={node.user.id}
                  node={node}
                  depth={0}
                  onEdit={openEdit}
                  onSuspend={(m) => setSuspendingUser(m)}
                  onActivate={(m) => setActivatingUser(m)}
                  onDelete={(m) => setDeletingUser(m)}
                  onToggleDuty={(userIsSuperAdmin || isAdmin(currentUser)) ? ((m, isOffDuty) => toggleDutyMutation.mutate({ userId: m.id, isOffDuty })) : undefined}
                  onSaveQuota={(userIsSuperAdmin || isAdmin(currentUser)) ? ((m, val) => updateQuotaMutation.mutate({ userId: m.id, dailyLeadQuota: val })) : undefined}
                  onResetPassword={userIsSuperAdmin ? (m) => setResettingUser(m) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Team Member' : 'Invite Team Member'}</DialogTitle>
            <DialogDescription>
              {editingMember ? 'Update member details and permissions.' : 'Add a new member to your organization.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  defaultValue={editingMember?.firstName}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  defaultValue={editingMember?.lastName}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingMember?.email}
                required
                disabled={!!editingMember && !isAdmin(currentUser)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Job Title / Position</Label>
              <Input
                id="position"
                name="position"
                defaultValue={editingMember?.position}
                placeholder="e.g. Sales Manager"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={editingMember?.phone}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{editingMember ? 'New Password (Optional)' : 'Password'}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={editingMember ? '••••••••' : 'Minimum 8 characters'}
                  required={!editingMember}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={editingMember?.role.id || 'sales_rep'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesData?.roles?.map((role: any) => (
                      <SelectItem key={role.roleKey} value={role.roleKey}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchId">Branch</Label>
                <Select name="branchId" defaultValue={editingMember?.branch?.id || "none"}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Branch</SelectItem>
                    {branches?.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyLeadQuota">Daily Lead Quota</Label>
              <Input
                id="dailyLeadQuota"
                name="dailyLeadQuota"
                type="number"
                defaultValue={editingMember?.dailyLeadQuota}
                placeholder="Number of leads per day (e.g. 10)"
                min="0"
              />
              <p className="text-[10px] text-muted-foreground">
                Limit the number of leads this user can be assigned per day. Leave empty for no limit.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportsTo">Reports To</Label>
              <Select name="reportsTo" defaultValue={editingMember?.reportsTo?.id || "none"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {members
                    .filter((m: TeamMember) => m.id !== editingMember?.id) // Prevent self-reporting
                    .map((member: TeamMember) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Assigning a manager creates a reporting hierarchy.
            </p>

            {/* Permission Control (Admin/Super Admin only) */}
            {(userIsSuperAdmin || isAdmin(currentUser)) && (
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Add Subordinates Permission</Label>
                  <p className="text-xs text-muted-foreground">
                    Allow this user to invite and create new team members below them in the hierarchy.
                  </p>
                </div>
                <Switch
                  id="canCreateSubordinates"
                  checked={canCreateSubordinates}
                  onCheckedChange={setCanCreateSubordinates}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending || updateMutation.isPending}>
                {editingMember ? 'Update Member' : 'Send Invite'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Suspend Confirmation Dialog ────────────────── */}
      <Dialog open={!!suspendingUser} onOpenChange={() => setSuspendingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User?</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend <strong>{suspendingUser?.firstName} {suspendingUser?.lastName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm">
            <p className="text-muted-foreground p-3 bg-muted rounded-lg border border-border">
              {suspendingUser?.reportsTo ? (
                <>All active leads and tasks will be transferred to their manager, <strong>{suspendingUser.reportsTo.firstName} {suspendingUser.reportsTo.lastName}</strong>.</>
              ) : (
                <>This user has no manager assigned. All active leads and tasks will be transferred to the <strong>Organization Admin</strong>.</>
              )}
            </p>
            <p className="text-xs text-destructive">
              The user will no longer be able to access the CRM until reactivated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendingUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => suspendingUser && suspendMutation.mutate(suspendingUser.id)}
              disabled={suspendMutation.isPending}
            >
              {suspendMutation.isPending ? "Configuring..." : "Confirm Suspension"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Activate Confirmation Dialog ───────────────── */}
      <Dialog open={!!activatingUser} onOpenChange={() => setActivatingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate User?</DialogTitle>
            <DialogDescription>
              Reactivate <strong>{activatingUser?.firstName} {activatingUser?.lastName}</strong>'s account access.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/30">
              <Avatar className="h-12 w-12 grayscale opacity-70">
                <AvatarImage src={activatingUser?.avatar} />
                <AvatarFallback>{activatingUser?.firstName[0]}{activatingUser?.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 font-bold text-lg leading-none mb-1">
                  {activatingUser?.firstName} {activatingUser?.lastName}
                  <Badge variant="destructive" className="text-[10px] uppercase font-bold px-1.5 h-5 bg-red-500/10 text-red-600 border-red-200">
                    Suspended
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">{activatingUser?.email}</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-5 rounded-xl border-2 border-primary/20 bg-primary/5 shadow-sm">
              <div className="space-y-1">
                <Label className="text-base font-bold text-primary">Restore assigned items</Label>
                <p className="text-xs text-muted-foreground max-w-[280px]">
                  Automatically pull all transferred leads, accounts, and tasks back to this user's ownership.
                </p>
              </div>
              <Switch
                checked={moveBack}
                onCheckedChange={setMoveBack}
                className="scale-110"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivatingUser(null)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => activatingUser && activateMutation.mutate({ userId: activatingUser.id, moveBack })}
              disabled={activateMutation.isPending}
            >
              {activateMutation.isPending ? "Activating..." : "Confirm Activation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Move to Trash Confirmation Dialog ───────── */}
      <Dialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2 font-bold text-xl">
              <Trash2 className="h-6 w-6" /> Delete User Permanently?
            </DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to delete <strong>{deletingUser?.firstName} {deletingUser?.lastName}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 text-sm">
            <div className="p-4 bg-red-500/10 border border-red-200 rounded-xl space-y-3">
              <p className="font-bold text-red-600 flex items-center gap-2 uppercase tracking-wider text-xs">
                <Shield className="h-4 w-4" /> Critical Warning
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-red-600/80 font-medium">
                <li>All assigned leads/tasks will be transferred to their manager.</li>
                <li>The user will be <strong>permanently deleted</strong> and cannot be restored.</li>
                <li>The user will lose access to all CRM data immediately.</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl font-bold px-6"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── Reset Password Confirmation Dialog ───────── */}
      <Dialog open={!!resettingUser} onOpenChange={() => setResettingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold text-xl">
              <Key className="h-6 w-6 text-primary" /> Reset User Password
            </DialogTitle>
            <DialogDescription className="text-base">
              Enter a new password for <strong>{resettingUser?.firstName} {resettingUser?.lastName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Minimum 8 characters"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted p-3 rounded-lg border border-border">
              This will immediately update the user's password. They will need to use the new password for their next login.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResettingUser(null)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={() => resettingUser && resetPasswordMutation.mutate({ userId: resettingUser.id, newPassword: resetPassword })}
              disabled={resetPasswordMutation.isPending || resetPassword.length < 8}
              className="rounded-xl font-bold px-6"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
