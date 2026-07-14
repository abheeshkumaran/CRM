import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, Phone, MessageCircle, ChevronDown, ChevronRight, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { type Lead } from "@/services/leadService"
import { format } from "date-fns"
import { ActionsCell } from "./ActionsCell"
import { toast } from "sonner"
import { formatWhatsAppNumber } from "@/lib/utils"
import { isMobileApp, initiateCall as initiateCallBridge } from "@/utils/mobileBridge"

import { NameCell } from "./NameCell"
import { StatusCell } from "./StatusCell"

export const columns: ColumnDef<Lead>[] = [
  {
    id: "select",
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => {
          table.toggleAllPageRowsSelected(!!value)
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => {
          row.toggleSelected(!!value)
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "expander",
    size: 40,
    header: () => null,
    cell: ({ row }) => {
      return row.getCanExpand() ? (
        <Button
          variant="ghost"
          onClick={row.getToggleExpandedHandler()}
          className="p-0 h-6 w-6"
        >
          {row.getIsExpanded() ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      ) : null
    },
  },
  {
    accessorKey: "firstName",
    size: 180,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <NameCell lead={row.original} />
  },
  {
    accessorKey: "phone",
    size: 200,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        >
          Phone
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const phone = row.getValue("phone") as string;
      if (!phone) return <span className="text-muted-foreground/30 text-xs italic">-</span>;

      const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(phone);
        toast.success("Phone number copied");
      };

      return (
        <div className="flex items-center gap-1 group">
          <span className="text-sm font-medium">{phone}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
            onClick={handleCopy}
            title="Copy Number"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }
  },
  {
    accessorKey: "assignedTo",
    size: 150,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        >
          Owner
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const assignedTo = row.original.assignedTo as any;
      if (!assignedTo) return <span className="text-muted-foreground/30 text-xs italic">Unassigned</span>;
      return <div className="text-sm font-medium">{assignedTo.firstName} {assignedTo.lastName || ''}</div>;
    }
  },
  {
    accessorKey: "source",
    size: 100,
    header: "Source",
    cell: ({ row }) => {
      const lead = row.original;
      const source = lead.source as string;
      const originalSource = lead.sourceDetails?.originalSource;
      
      // If it's an API lead and we have the original source label, show that instead
      const displaySource = (source === 'api' && originalSource) ? originalSource : source;

      return (
        <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/20">
          {displaySource}
        </Badge>
      );
    }
  },
  {
    id: "campaign",
    size: 150,
    header: "Campaign",
    cell: ({ row }) => {
      const lead = row.original;
      const campaignName = lead.sourceDetails?.campaignName || lead.sourceDetails?.metaCampaignName;
      
      if (!campaignName) return <span className="text-muted-foreground/30 text-xs italic">-</span>;
      
      return (
        <div className="text-xs font-medium truncate max-w-[140px]" title={campaignName}>
          {campaignName}
        </div>
      );
    }
  },
  {
    accessorKey: "nextFollowUp",
    size: 150,
    header: "Next Follow-up",
    cell: ({ row }) => {
      const date = row.getValue("nextFollowUp") as string
      if (!date) return <div className="text-muted-foreground/30 text-xs italic">-</div>
      const followUpDate = new Date(date)
      return (
        <div className="text-indigo-400 font-medium text-sm">
          {format(followUpDate, "MMM d, h:mm a")}
        </div>
      )
    }
  },
  {
    accessorKey: "status",
    size: 120,
    header: "Status",
    cell: ({ row }) => <StatusCell statusId={row.getValue("status")} />
  },
  {
    accessorKey: "createdAt",
    size: 150,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-muted-foreground text-sm">{format(new Date(row.getValue("createdAt")), "MMM d, yyyy, h:mm a")}</div>
    }
  },
  {
    accessorKey: "updatedAt",
    size: 150,
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-accent hover:text-accent-foreground text-muted-foreground"
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="text-muted-foreground text-sm">{format(new Date(row.getValue("updatedAt")), "MMM d, yyyy")}</div>
    }
  },
  {
    id: "contact",
    size: 100,
    header: "Contact",
    cell: ({ row }) => {
      const lead = row.original
      const phone = formatWhatsAppNumber(lead.phone, lead.phoneCountryCode)
      if (!phone) return <span className="text-muted-foreground/50 text-xs italic">No phone</span>

      const logAndOpenWhatsApp = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!phone) {
          toast.error('No phone number available')
          return
        }

        const callSessionId = crypto.randomUUID()

        try {
          const userInfo = localStorage.getItem('userInfo')
          const token = userInfo ? JSON.parse(userInfo).token : null
          await fetch(`/api/interactions/leads/${row.original.id}/quick-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ type: 'whatsapp', phoneNumber: phone, callSessionId })
          })
        } catch (err) {
          console.warn('Failed to log WhatsApp interaction:', err)
        }
        window.location.href = `https://wa.me/${phone}`
      }

      const logAndCall = async (e: React.MouseEvent) => {
        e.stopPropagation()
        const callSessionId = crypto.randomUUID()
        
        // If in mobile app, try native bridge first
        if (isMobileApp()) {
          initiateCallBridge(phone, callSessionId);
        }

        try {
          const userInfo = localStorage.getItem('userInfo')
          const token = userInfo ? JSON.parse(userInfo).token : null
          await fetch(`/api/interactions/leads/${lead.id}/quick-log`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ type: 'call', phoneNumber: phone, callSessionId })
          })
        } catch (err) {
          console.warn('Failed to log Call interaction:', err)
        }

        if (!isMobileApp()) {
          window.location.href = `tel:${phone}`
        }
      }

      return (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-success hover:text-success/80 hover:bg-success/10"
            onClick={logAndOpenWhatsApp}
            title="WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-info hover:text-info/80 hover:bg-info/10"
            onClick={logAndCall}
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  },
  {
    id: "actions",
    size: 50,
    cell: ({ row }) => <ActionsCell lead={row.original} />,
  },
]
