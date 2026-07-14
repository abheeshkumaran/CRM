import { useQuery } from "@tanstack/react-query"
import { getEmailCampaigns, type Campaign } from "@/services/marketingService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Plus } from "lucide-react"
import { Link } from "react-router-dom"
import { format } from "date-fns"

export function EmailCampaigns() {
  const { data: campaignsData, isLoading, isError } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => getEmailCampaigns(),
    refetchInterval: 5000,
  })

  const campaigns = campaignsData?.campaigns || [];

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
        <div className="text-red-500 mb-4">Error loading campaigns. Please try again.</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Email Campaigns</h3>
          <p className="text-sm text-muted-foreground">Manage your newsletters and automated sequences.</p>
        </div>
        <Link to="/marketing/campaigns/new">
          <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaigns?.reduce((acc: number, c: Campaign) => acc + (c.stats?.sent || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500">Loading campaigns...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns?.map((campaign: Campaign) => (
              <Card key={campaign.id}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-semibold flex items-center space-x-2">
                      <span>{campaign.name}</span>
                      <Badge variant={campaign.status === 'sent' ? 'secondary' : 'outline'}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{campaign.subject}</p>
                  </div>
                  <div className="flex items-center space-x-8 text-sm">
                    <div className="text-center">
                      <p className="font-bold">{campaign.stats?.sent || 0}</p>
                      <p className="text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold">{campaign.stats?.opened || 0}</p>
                      <p className="text-muted-foreground">Opened</p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">
                        {campaign.sentAt ? format(new Date(campaign.sentAt), "MMM d, yyyy") : "Draft"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {campaigns.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium mb-1">No campaigns yet</h3>
                <p className="text-gray-500 mb-4">Create your first email campaign to get started.</p>
                <Link to="/marketing/campaigns/new">
                  <Button variant="outline">
                    Create Campaign
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
