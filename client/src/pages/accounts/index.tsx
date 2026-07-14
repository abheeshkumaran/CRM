import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { getAccounts } from "@/services/accountService"
import { Button } from "@/components/ui/button"

import { Link } from "react-router-dom"
import {
  Plus,
  Filter,
  Download
} from "lucide-react"

export default function AccountsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => getAccounts(),
    refetchInterval: 5000,
  })

  const accounts = data?.accounts || []

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
        <div className="text-red-500 mb-4">Error loading accounts. Please try again.</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground mt-1">Manage your business accounts and customers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden">
          <DataTable columns={columns} data={accounts} searchKeys={["name", "industry", "website", "phone"]} />
        </div>
      )}
    </div>
  )
}
