import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getUsers } from "@/services/userService"
import { bulkLeadAction } from "@/services/leadService"
import { toast } from "sonner"
import { Loader2, Users, Search, Check, ChevronsUpDown } from "lucide-react"

interface BulkAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeads: string[]
  onSuccess: () => void
}

export function BulkAssignDialog({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: BulkAssignDialogProps) {
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetchingUsers, setFetchingUsers] = useState(false)
  const [openPopover, setOpenPopover] = useState(false)

  useEffect(() => {
    if (open) {
      fetchUsers()
      setSearchTerm("")
    }
  }, [open])

  const fetchUsers = async () => {
    setFetchingUsers(true)
    try {
      const data = await getUsers()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
      toast.error("Failed to load users list")
    } finally {
      setFetchingUsers(false)
    }
  }

  const filteredUsers = users.filter(user => {
    const name = `${user.firstName} ${user.lastName}`.toLowerCase()
    const email = (user.email || '').toLowerCase()
    const search = searchTerm.toLowerCase()
    return name.includes(search) || email.includes(search)
  })

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user")
      return
    }

    setLoading(true)
    try {
      await bulkLeadAction("assign", selectedLeads, { assignedToId: selectedUserId })
      toast.success(`Successfully assigned ${selectedLeads.length} leads`)
      onSuccess()
      onOpenChange(false)
      setSelectedUserId("")
    } catch (error: any) {
      console.error("Bulk assignment failed:", error)
      toast.error(error.message || "Failed to assign leads")
    } finally {
      setLoading(false)
    }
  }

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Bulk Assign Leads
          </DialogTitle>
          <DialogDescription>
            Reassign {selectedLeads.length} selected leads to a specific team member.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Select User
            </label>
            
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-10 font-normal border-muted-foreground/20 hover:border-primary/50 transition-colors"
                  disabled={fetchingUsers || loading}
                >
                  {selectedUser ? (
                    <span className="truncate">{selectedUser.firstName} {selectedUser.lastName}</span>
                  ) : (
                    <span className="text-muted-foreground">Select a team member...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                <div className="flex items-center border-b px-3 h-10 bg-muted/30">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 border-0 focus-visible:ring-0 px-0 bg-transparent text-sm placeholder:text-muted-foreground/60 w-full"
                    autoFocus
                  />
                </div>
                <ScrollArea className="h-64">
                  <div className="p-1">
                    {filteredUsers.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No users found.
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUserId(user.id)
                            setOpenPopover(false)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground text-left transition-colors",
                            selectedUserId === user.id ? "bg-accent/50" : ""
                          )}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium truncate">{user.firstName} {user.lastName}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {user.email} • {user.role?.name || user.role}
                            </span>
                          </div>
                          {selectedUserId === user.id && (
                            <Check className="h-4 w-4 text-primary ml-2 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={loading || !selectedUserId}
            className="bg-primary text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
