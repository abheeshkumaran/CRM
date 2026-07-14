import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, CheckCircle2, CreditCard, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { OpportunityActions } from "./OpportunityActions"
import type { Opportunity } from "@/services/opportunityService"

export const createOpportunityColumns = (formatCurrency: (amount: number) => string): ColumnDef<Opportunity>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("name")}</div>
    }
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      return <div className="font-medium">{formatCurrency(amount)}</div>
    }
  },
  {
    accessorKey: "stage",
    header: "Stage",
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string
      const opportunity = row.original
      let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"
      const isExpected = ['prospecting', 'qualification', 'proposal', 'negotiation'].includes(stage)

      switch (stage) {
        case 'closed_won': variant = "default"; break;
        case 'closed_lost': variant = "destructive"; break;
        default:
          if (isExpected) variant = "outline";
          else variant = "secondary";
      }

      let label = isExpected ? 'Expected' : stage.replace('_', ' ')

      if (stage === 'closed_won') {
        if (opportunity.paymentStatus === 'paid') {
          return (
            <div className="flex items-center gap-2">
              <Badge variant={variant} className="capitalize">{label} (Payment Complete)</Badge>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          )
        } else if (opportunity.paymentStatus === 'emi') {
          return (
            <div className="flex items-center gap-2">
              <Badge variant={variant} className="capitalize">{label} (EMI Schedule Activate)</Badge>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </div>
          )
        } else if (opportunity.paymentStatus === 'partial') {
          return (
            <div className="flex items-center gap-2">
              <Badge variant={variant} className="capitalize">{label} (Partially Paid)</Badge>
              <Clock className="h-4 w-4 text-sky-500" />
            </div>
          )
        }
      }

      return <Badge variant={variant} className="capitalize">{label}</Badge>
    }
  },
  {
    accessorKey: "probability",
    header: "Prob.",
    cell: ({ row }) => {
      const prob = row.getValue("probability") as number
      return <div>{prob}%</div>
    }
  },
  {
    accessorKey: "account",
    header: "Account",
    cell: ({ row }) => {
      const account = row.original.account
      return account ? <span className="font-medium">{account.name}</span> : <span className="text-muted-foreground">-</span>
    }
  },
  {
    accessorKey: "branch.name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Branch
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const branch = row.original.branch
      return branch ? <span className="font-medium">{branch.name}</span> : <span className="text-muted-foreground">-</span>
    }
  },
  {
    accessorKey: "leadSource",
    header: "Source",
    cell: ({ row }) => {
      const source = row.original.leadSource
      return source ? (
        <Badge variant="outline" className="capitalize bg-primary/10 text-primary border-primary/20">
          {source.replace(/_/g, ' ')}
        </Badge>
      ) : <span className="text-muted-foreground">-</span>
    }
  },
  {
    accessorKey: "closeDate",
    header: "Close Date",
    cell: ({ row }) => {
      const date = row.getValue("closeDate")
      return date ? <div>{format(new Date(date as string), "MMM d, yyyy")}</div> : <div>-</div>
    }
  },
  {
    accessorKey: "leadStatus",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-transparent p-0"
        >
          Lead Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const opp = row.original
      const statusValue = opp.leadStatus || opp.lead?.status
      return statusValue ? (
        <Badge variant="outline" className="capitalize bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-medium">
          {statusValue.replace(/_/g, ' ')}
        </Badge>
      ) : <span className="text-muted-foreground">-</span>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const opportunity = row.original
      return <OpportunityActions opportunity={opportunity} />
    },
  },
]
