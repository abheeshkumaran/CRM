import { useQuery } from "@tanstack/react-query"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Trophy, AlertCircle } from "lucide-react"
import { getAssetUrl } from "@/lib/utils"
import { useCurrency } from "@/contexts/CurrencyContext"

import { getTopPerformers } from "@/services/analyticsService"

export function TopPerformersWidget({ branchId }: { branchId?: string | null }) {
  const { formatCurrency } = useCurrency();
  const { data: performers = [], isLoading, isError } = useQuery({
    queryKey: ['top-performers', branchId],
    queryFn: () => getTopPerformers(branchId || undefined),
    retry: 1,
    staleTime: 30000,
  });

  // Additional safety check: filter out any null/undefined items
  const performersList = (Array.isArray(performers) ? performers : []).filter((p: unknown) => p && typeof p === 'object');

  if (isError) {
    return (
      <Card className="col-span-2 rounded-3xl bg-card shadow-sm border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Unable to load top performers</p>
            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }



  return (
    <Card className="col-span-2 rounded-3xl bg-card shadow-sm border-0">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-card-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {performersList.map((user: any, index: number) => {
              // Validate user data
              if (!user || !user.id || !user.name) {
                console.warn('Invalid user data:', user);
                return null;
              }

              return (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-warning/20 text-warning' :
                      index === 1 ? 'bg-muted text-muted-foreground' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' : 'text-muted-foreground'
                      }`}>
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                      <AvatarImage
                        src={getAssetUrl(user.image)}
                        onError={(e) => {
                          // Silently handle missing images
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback>{user.name[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.dealsWon || 0} deals won</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-primary">
                      {formatCurrency(user.totalRevenue || 0, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            {performersList.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No performance data yet</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
