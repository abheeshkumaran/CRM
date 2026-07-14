import { useQuery } from "@tanstack/react-query"
import { api } from "@/services/api"
import { Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Link } from "react-router-dom"

export function LicenseUsageWidget() {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation-details'],
    queryFn: async () => {
      const res = await api.get('/organisation')
      return res.data
    }
  })

  // Resilient data fetching for both SuperAdmin and Regular Admin response structures
  const userLimit = org?.organisation?.userLimit || org?.organisation?.activeLicense?.maxUsers || org?.userLimit || 5
  const userCount = org?.stats?.userCount ?? org?.userCount ?? 0
  const usagePercent = Math.min(100, Math.round((userCount / (userLimit || 1)) * 100))

  return (
    <Link to="/settings/billing" className="block relative overflow-hidden rounded-[2rem] bg-card p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
      <div className="flex flex-col items-center justify-center space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-bold text-muted-foreground">License Usage</h3>
        <div className="text-2xl font-extrabold text-card-foreground">
          {isLoading ? <Skeleton className="h-8 w-16" /> : `${userCount} / ${userLimit}`}
        </div>
        <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground group-hover:bg-primary/20 transition-colors">
          {usagePercent}% Used
        </div>
      </div>
    </Link>
  )
}
