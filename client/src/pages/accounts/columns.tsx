import type { ColumnDef } from "@tanstack/react-table"
import { AccountActions } from "./AccountActions"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Account } from "@/services/accountService"
import { format } from "date-fns"

export const columns: ColumnDef<Account>[] = [
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
      const id = row.original.id;
      return (
        <div onClick={() => window.location.href = `/accounts/${id}`} className="font-medium cursor-pointer hover:underline text-blue-600">
          {row.getValue("name")}
        </div>
      )
    }
  },
  {
    accessorKey: "industry",
    header: "Industry",
    cell: ({ row }) => row.getValue("industry") || "-"
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string
      let variant: "default" | "secondary" | "destructive" | "outline" = "outline"

      switch (type ? type.toLowerCase() : '') {
        case 'prospect': variant = "secondary"; break;
        case 'customer': variant = "default"; break;
        case 'partner': variant = "outline"; break;
        case 'vendor': variant = "outline"; break;
      }

      return <Badge variant={variant} className="capitalize">{type || 'Unknown'}</Badge>
    }
  },
  {
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => {
      const website = row.getValue("website") as string
      return website ? <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{website}</a> : "-"
    }
  },
  {
    accessorKey: "owner",
    header: "Owner",
    cell: ({ row }) => {
      const owner = row.original.owner
      return owner ? <div>{owner.firstName} {owner.lastName}</div> : <span className="text-gray-400">Unassigned</span>
    }
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => {
      return <div>{format(new Date(row.getValue("createdAt")), "MMM d, yyyy")}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const account = row.original
      return <AccountActions account={account} />
    },
  },
]
