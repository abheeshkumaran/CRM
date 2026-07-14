import { type ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Link } from "react-router-dom"
import { EMIActions } from "./EMIActions"

export interface EMISchedule {
  id: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'active' | 'completed' | 'defaulted'
  startDate: string
  endDate: string
  opportunity: {
    id: string
    name: string
    lead?: {
      id: string
      firstName: string
      lastName: string
      email?: string
      phone?: string
    }
  }
  installments: Array<{
    id: string
    installmentNumber: number
    amount: number
    dueDate: string
    status: 'pending' | 'paid' | 'overdue' | 'missed'
    paidAmount: number
    paidDate: string | null
  }>
  createdAt: string
}

export const columns: ColumnDef<EMISchedule>[] = [
  {
    accessorKey: "opportunity.lead",
    header: "Lead",
    cell: ({ row }) => {
      const lead = row.original.opportunity?.lead
      if (!lead) return <div className="text-gray-500 text-sm">-</div>
      return (
        <div className="flex flex-col">
          <Link
            to={`/leads/${lead.id}`}
            className="font-medium hover:underline text-blue-600"
          >
            {lead.firstName} {lead.lastName}
          </Link>
          {lead.phone && <span className="text-xs text-muted-foreground">{lead.phone}</span>}
        </div>
      )
    }
  },
  {
    accessorKey: "opportunity.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Opportunity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const opp = row.original.opportunity
      return (
        <Link
          to={`/opportunities/${opp?.id || ''}`}
          className="font-medium hover:underline text-blue-600"
        >
          {opp?.name || 'Unknown Opportunity'}
        </Link>
      )
    }
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount",
    cell: ({ row }) => {
      return <div className="font-medium">₹{row.getValue<number>("totalAmount").toLocaleString('en-IN')}</div>
    }
  },
  {
    accessorKey: "paidAmount",
    header: "Paid",
    cell: ({ row }) => {
      return <div className="text-green-600 font-medium">₹{row.getValue<number>("paidAmount").toLocaleString('en-IN')}</div>
    }
  },
  {
    accessorKey: "remainingAmount",
    header: "Remaining",
    cell: ({ row }) => {
      return <div className="text-orange-600 font-medium">₹{row.getValue<number>("remainingAmount").toLocaleString('en-IN')}</div>
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      let variant: "default" | "secondary" | "destructive" = "secondary"

      switch (status) {
        case 'completed': variant = "default"; break;
        case 'active': variant = "secondary"; break;
        case 'defaulted': variant = "destructive"; break;
      }

      return <Badge variant={variant} className="capitalize">{status}</Badge>
    }
  },
  {
    header: "Installments",
    cell: ({ row }) => {
      const installments = row.original.installments || []
      const total = installments.length
      const paid = installments.filter(i => i.status === 'paid').length
      const overdue = installments.filter(i => i.status === 'overdue' || i.status === 'missed').length

      return (
        <div className="text-sm">
          <div>{paid}/{total} paid</div>
          {overdue > 0 && <div className="text-red-500 text-xs">{overdue} overdue</div>}
        </div>
      )
    }
  },
  {
    id: "previousInstallment",
    header: "Previous Installment",
    cell: ({ row }) => {
      const installments = [...(row.original.installments || [])].sort((a, b) => a.installmentNumber - b.installmentNumber)
      const present = installments.find(i => i.status === 'pending' || i.status === 'overdue')
      const presentIndex = present ? installments.findIndex(i => i.id === present.id) : installments.length
      const previous = presentIndex > 0 ? installments[presentIndex - 1] : null

      if (!previous) return <div className="text-gray-500 text-sm">-</div>

      let color = "text-gray-600"
      if (previous.status === 'paid') color = "text-green-600"
      if (previous.status === 'missed') color = "text-red-600"

      return (
        <div className="text-sm">
          <div className={`font-medium capitalize ${color}`}>{previous.status}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(previous.dueDate), "MMM d")}</div>
        </div>
      )
    }
  },
  {
    id: "presentInstallment",
    header: "Present Installment",
    cell: ({ row }) => {
      const installments = [...(row.original.installments || [])].sort((a, b) => a.installmentNumber - b.installmentNumber)
      const present = installments.find(i => i.status === 'pending' || i.status === 'overdue')

      if (!present) return <div className="text-gray-500 text-sm">-</div>

      let color = "text-blue-600"
      if (present.status === 'overdue') color = "text-orange-600"

      return (
        <div className="text-sm">
          <div className={`font-medium capitalize ${color}`}>{present.status}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(present.dueDate), "MMM d")}</div>
        </div>
      )
    }
  },
  {
    accessorKey: "startDate",
    header: "Start Date",
    cell: ({ row }) => {
      const date = row.getValue("startDate")
      return date ? <div>{format(new Date(date as string), "MMM d, yyyy")}</div> : <div>-</div>
    }
  },
  {
    accessorKey: "endDate",
    header: "End Date",
    cell: ({ row }) => {
      const date = row.getValue("endDate")
      return date ? <div>{format(new Date(date as string), "MMM d, yyyy")}</div> : <div>-</div>
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <EMIActions schedule={row.original} />
  },
]
