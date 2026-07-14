import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Clock, CheckCircle2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type FollowUpTask } from "@/services/followUpService"
import { format, isPast, isToday } from "date-fns"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/services/api"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { Phone, Edit, MoreHorizontal } from "lucide-react"
import { LogCallDialog } from "@/components/LogCallDialog"
import { UpdateFollowUpDialog } from "@/components/UpdateFollowUpDialog"
import { createInteraction } from "@/services/interactionService"
import { useState } from "react"

export const columns: ColumnDef<FollowUpTask>[] = [
  {
    accessorKey: "leadName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Lead Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const task = row.original
      const related = task.relatedTo as any
      const leadId = task.leadId || (task.onModel === 'Lead' ? related?.id : null)

      if (!related || task.onModel !== 'Lead') {
        return <div className="font-medium">{task.subject}</div>
      }

      const name = `${related.firstName || ''} ${related.lastName || ''}`.trim() || related.company || 'Unknown'

      return (
        <Link
          to={`/leads/${leadId}`}
          className="font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          {name}
        </Link>
      )
    }
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => {
      const branch = row.original.branch
      return (
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 font-medium">
            {branch?.name || "Main Branch"}
          </Badge>
        </div>
      )
    }
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = row.getValue("dueDate") as string
      if (!date) return <div>-</div>

      const dueDate = new Date(date)
      const isOverdue = isPast(dueDate) && row.original.status !== 'completed'
      const isDueToday = isToday(dueDate) && !isOverdue && row.original.status !== 'completed'

      return (
        <div className={cn(
          "flex items-center gap-2",
          isOverdue && "text-red-600 font-semibold",
          isDueToday && "text-orange-600 font-semibold"
        )}>
          {(isOverdue || isDueToday) && <Clock className="h-3 w-3" />}
          {format(dueDate, "MMM d, yyyy, h:mm a")}
          {isOverdue && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
          {isDueToday && <Badge className="text-xs bg-orange-500">Today</Badge>}
        </div>
      )
    }
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline"

      switch (status) {
        case 'completed': variant = "default"; break;
        case 'in_progress': variant = "secondary"; break;
        case 'not_started': variant = "outline"; break;
        case 'deferred': variant = "destructive"; break;
      }

      return <Badge variant={variant} className="capitalize">{status.replace('_', ' ')}</Badge>
    }
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const priority = row.getValue("priority") as string
      let colorClass = "";
      switch (priority) {
        case 'high': colorClass = "text-red-500 font-bold"; break;
        case 'medium': colorClass = "text-yellow-600"; break;
        case 'low': colorClass = "text-green-600"; break;
      }
      return <span className={`capitalize ${colorClass}`}>{priority}</span>
    }
  },
  {
    accessorKey: "assignedTo",
    header: "Assigned To",
    cell: ({ row }) => {
      const assigned = row.getValue("assignedTo") as { firstName: string; lastName: string; email: string } | null;

      if (!assigned) return <span className="text-gray-400">-</span>;

      return (
        <div className="text-sm">
          {assigned.firstName} {assigned.lastName}
        </div>
      );
    }
  },
  {
    accessorKey: "createdBy",
    header: "Created By",
    cell: ({ row }) => {
      const creator = row.getValue("createdBy") as { firstName: string; lastName: string; email: string } | null;

      if (!creator) return <span className="text-gray-400">-</span>;

      return (
        <div className="text-sm text-muted-foreground">
          {creator.firstName} {creator.lastName}
        </div>
      );
    }
  },
  {
    accessorKey: "relatedTo",
    header: "Related To",
    cell: ({ row }) => {
      const related = row.original.relatedTo as { name?: string; firstName?: string; lastName?: string; company?: string } | null
      const model = row.original.onModel
      if (!related || !model) return <span className="text-gray-400">-</span>;

      const name = related.name || related.company || `${related.firstName || ''} ${related.lastName || ''}`.trim()
      return (
        <div className="text-sm">
          <span className="text-xs text-muted-foreground mr-1">{model}:</span>
          <span className="font-medium">{name}</span>
        </div>
      )
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const task = row.original
      const queryClient = useQueryClient()
      const [showCallDialog, setShowCallDialog] = useState(false)
      const [showUpdateDialog, setShowUpdateDialog] = useState(false)

      const updateStatus = async (newStatus: string) => {
        try {
          await api.put(`/follow-ups/${task.id}`, { status: newStatus })
          
          // If related to a Lead, log an interaction for the timeline
          const leadId = task.leadId || (task.onModel === 'Lead' ? (task.relatedTo as any)?.id : null)
          if (leadId) {
            await createInteraction({
              type: 'note',
              direction: 'outbound',
              status: 'completed',
              subject: `Task Status: ${newStatus.replace('_', ' ')}`,
              description: `Follow-up status changed to ${newStatus.replace('_', ' ')} for task: ${task.subject}`,
              date: new Date().toISOString(),
              relatedTo: leadId,
              onModel: 'Lead'
            })
            
            // Invalidate lead timeline
            queryClient.invalidateQueries({ queryKey: ['timeline', 'lead', leadId] })
          }

          toast.success('Status updated successfully')
          queryClient.invalidateQueries({ queryKey: ['follow-ups'] })
        } catch (error: any) {
          toast.error(error.response?.data?.message || 'Failed to update status')
        }
      }

      const related = task.relatedTo as any
      const leadName = related?.name || `${related?.firstName || ''} ${related?.lastName || ''}`.trim() || 'Lead'
      const leadPhone = related?.phone || ''

      return (
        <div className="flex items-center gap-2">
          {task.onModel === 'Lead' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() => setShowCallDialog(true)}
              title="Call Lead"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}

          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={() => setShowUpdateDialog(true)}
            title="Update Follow-up"
          >
            <Edit className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to={`/leads/${task.leadId || (task.relatedTo as any)?.id}`} className="w-full cursor-pointer">
                  View Lead
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Quick Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => updateStatus('not_started')}>
                Not Started
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('in_progress')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('completed')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateStatus('deferred')}>
                Deferred
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {showCallDialog && (
            <LogCallDialog
              open={showCallDialog}
              onOpenChange={setShowCallDialog}
              leadId={task.leadId || (task.relatedTo as any)?.id}
              leadName={leadName}
              leadPhone={leadPhone}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['follow-ups'] })}
            />
          )}

          {showUpdateDialog && (
            <UpdateFollowUpDialog
              open={showUpdateDialog}
              onOpenChange={setShowUpdateDialog}
              task={task as any}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ['follow-ups'] })}
            />
          )}
        </div>
      )
    }
  },
]
