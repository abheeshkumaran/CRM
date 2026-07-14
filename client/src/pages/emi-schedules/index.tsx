import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { api } from "@/services/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function EMISchedulesPage() {
  const [activeTab, setActiveTab] = useState("active")

  const { data, isLoading, isError } = useQuery({
    queryKey: ['emi-schedules', activeTab],
    queryFn: async () => {
      const response = await api.get(`/emi-schedules?status=${activeTab}`)
      return response.data
    },
  })

  const schedules = data?.schedules || []

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-red-500">Error loading EMI schedules. Please try again.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">EMI Schedules</h1>
        <p className="text-muted-foreground mt-1">Manage payment installments and track EMI status.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="active">Active EMIs</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="defaulted">Defaulted</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={schedules} 
              searchKeys={["opportunity.name", "status"]} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
