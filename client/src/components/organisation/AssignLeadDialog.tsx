import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getLeads, bulkAssignLeads, type Lead } from "@/services/leadService"
import { Loader2, Search } from "lucide-react"
import { toast } from "sonner"

interface AssignLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assigneeId: string
  assigneeName: string
}

export function AssignLeadDialog({ open, onOpenChange, assigneeId, assigneeName }: AssignLeadDialogProps) {
  const [search, setSearch] = useState("")
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const queryClient = useQueryClient()

  // Fetch unassigned or all leads? Generally we assign form unassigned pool or re-assign.
  // Let's fetch leads that are NOT assigned to the current user (if we want to re-assign) 
  // or just all leads and let user filter.
  // For manual assignment, usually managers want to see "New" leads or "Unassigned" leads.
  // Let's fetch all leads but default view might need filtering. 
  // Ideally we should have a filter in the API for "unassigned".
  // For now, let's just fetch recent leads and allow searching.
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', 'assign-modal', search],
    queryFn: () => getLeads({ search, limit: 50, sortOrder: 'desc' }), // Fetch 50 most recent
    enabled: open
  })

  const assignMutation = useMutation({
    mutationFn: async (leadIds: string[]) => {
      return await bulkAssignLeads(leadIds, assigneeId)
    },
    onSuccess: (data) => {
      toast.success(`Successfully assigned ${data.count} leads to ${assigneeName}`)
      onOpenChange(false)
      setSelectedLeads([])
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
    onError: (error: unknown) => {
      const err = error as { message?: string };
      toast.error(err.message || "Failed to assign leads")
    }
  })

  const handleToggleLead = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId)
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const handleAssign = () => {
    if (selectedLeads.length === 0) return
    assignMutation.mutate(selectedLeads)
  }

  const leads = (leadsData as { leads: Lead[] } | undefined)?.leads || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col" aria-describedby="assign-lead-desc">
        <DialogHeader>
          <DialogTitle>Assign Leads to {assigneeName}</DialogTitle>
          <DialogDescription id="assign-lead-desc">
            Select leads to assign to this user. You can search by name, email, or company.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p>No leads found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedLeads.length === leads.length && leads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeads(leads.map((l: Lead) => l.id))
                        } else {
                          setSelectedLeads([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: Lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.includes(lead.id)}
                        onCheckedChange={() => handleToggleLead(lead.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                        <span className="text-xs text-muted-foreground">{lead.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{lead.company || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.assignedTo ? (
                        <span className="text-sm">
                          {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                        </span>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="mt-4">
          <div className="flex-1 flex items-center text-sm text-muted-foreground">
            {selectedLeads.length} leads selected
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedLeads.length === 0 || assignMutation.isPending}
          >
            {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
