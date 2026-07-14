
import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Check } from "lucide-react"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { getHierarchy, getProfile } from "@/services/settingsService"
import type { User } from "@/services/settingsService"
import { api } from "@/services/api"
import { Badge } from "@/components/ui/badge"
import { isAdmin } from "@/lib/utils"

interface AssignLeadDialogProps {
  lead: { id: string; assignedTo?: string | { id: string, _id?: string, firstName?: string } }
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function AssignLeadDialog({ lead, open, onOpenChange, trigger }: AssignLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const queryClient = useQueryClient()

  const isControlled = open !== undefined
  const finalOpen = isControlled ? open : internalOpen

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Initialize state from props when opening
      let initialId = ""
      if (lead?.assignedTo) {
        if (typeof lead.assignedTo === 'string') {
          initialId = lead.assignedTo
        } else if (typeof lead.assignedTo === 'object') {
          const assignObj = lead.assignedTo as { id?: string, _id?: string }
          initialId = assignObj.id || assignObj._id || ""
        }
      }
      setSelectedUserId(initialId)
    }

    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  // Get current user profile to determine role and position in hierarchy
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile
  })

  // Get hierarchy to find assignable users (subordinates)
  const { data: hierarchyData, isLoading: hierarchyLoading } = useQuery({
    queryKey: ['hierarchy'],
    queryFn: getHierarchy,
    enabled: !!finalOpen
  })

  // Calculate assignable users based on hierarchy
  const assignableUsers = useMemo(() => {
    if (!hierarchyData?.users || !profile) return []

    // If admin/super_admin, can assign to anyone
    if (isAdmin(profile)) {
      return hierarchyData.users
    }

    // Otherwise, find subordinates (BFS/DFS on the flat list using reportsToId)
    // Or simpler: traverse the hierarchy tree if provided, or build adjacency list from flat users
    const subordinates = new Set<string>()
    const queue = [profile.id]

    // Build adjacency list for fast lookup: parentId -> [childIds]
    const reportsToMap = new Map<string, string[]>()
    hierarchyData.users.forEach((u: User & { reportsToId?: string }) => {
      if (u.reportsToId) {
        const existing = reportsToMap.get(u.reportsToId) || []
        reportsToMap.set(u.reportsToId, [...existing, u.id])
      }
    })

    // Collect all descendants
    while (queue.length > 0) {
      const currentId = queue.shift()!
      subordinates.add(currentId) // Add self and descendants
      const children = reportsToMap.get(currentId) || []
      queue.push(...children)
    }

    return hierarchyData.users.filter((u: User) => subordinates.has(u.id))

  }, [hierarchyData, profile])


  const assignMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.put(`/leads/${lead.id}`, { assignedTo: userId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success("Lead reassigned successfully")
      handleOpenChange(false)
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to reassign lead")
    }
  })

  const handleSave = () => {
    if (!selectedUserId) return
    assignMutation.mutate(selectedUserId)
  }

  return (
    <Dialog open={finalOpen} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Assign Lead</DialogTitle>
          <DialogDescription>
            Select a user to assign this lead to. You can assign to yourself or your subordinates.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={hierarchyLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {assignableUsers.map((user: User & { role: string }) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <span>{user.firstName} {user.lastName}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-5">
                        {user.role}
                      </Badge>
                      {typeof lead.assignedTo === 'object' && lead.assignedTo?.id === user.id && <Check className="h-3 w-3 ml-auto opacity-50" />}
                    </div>
                  </SelectItem>
                ))}
                {assignableUsers.length === 0 && !hierarchyLoading && (
                  <div className="p-2 text-sm text-muted-foreground text-center">No assignable users found</div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={assignMutation.isPending || !selectedUserId}>
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
