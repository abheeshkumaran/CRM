import { useQuery } from "@tanstack/react-query"
import { getTerritories } from "@/services/settingsService"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users } from "lucide-react"

interface Territory {
  id: string;
  name: string;
  region?: string;
  isActive: boolean;
  members?: unknown[];
  manager?: { firstName: string; lastName: string };
}

export default function TerritoriesSettingsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['territories'],
    queryFn: getTerritories
  })

  const territories = data?.territories || []

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Territories</h1>
              <p className="text-gray-500">Manage sales territories and regions</p>
            </div>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Sales Territories</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-12"><div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" /></div>
                ) : territories.length === 0 ? (
                  <div className="text-center py-12 text-gray-500"><MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No territories defined</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {territories.map((territory: Territory) => (
                      <div key={territory.id} className="p-4 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center"><MapPin className="h-5 w-5 text-white" /></div>
                            <div>
                              <p className="font-semibold">{territory.name}</p>
                              <p className="text-sm text-gray-500">{territory.region || 'No region'}</p>
                            </div>
                          </div>
                          <Badge variant={territory.isActive ? "default" : "secondary"}>{territory.isActive ? 'Active' : 'Inactive'}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
                          <Users className="h-4 w-4" />
                          <span>{territory.members?.length || 0} members</span>
                          {territory.manager && <span>• Manager: {territory.manager.firstName} {territory.manager.lastName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
