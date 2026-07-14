import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Facebook, Plus, ExternalLink, BarChart3, Users, MousePointer2, CheckCircle2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getOrganisation } from "@/services/settingsService"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { CreateAdDialog } from "./CreateAdDialog"

export function MetaCampaigns() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { data: organisation } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  });

  const isConnected = organisation?.integrations?.meta?.connected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Meta Ads Manager</h3>
          <p className="text-sm text-muted-foreground">Manage your Facebook and Instagram ad campaigns.</p>
        </div>
        <Button
          className="bg-[#1877F2] hover:bg-[#166fe5] text-white"
          disabled={!isConnected}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Ad Campaign
        </Button>
      </div>

      {/* Connection Status Card */}
      <Card className={`border ${isConnected ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900'}`}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
              <Facebook className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-200">{isConnected ? 'Connected' : 'Not Connected'}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected
                  ? 'Your Meta Business Suite is connected and syncing.'
                  : 'Connect your Meta Business Suite to see ad performance.'}
              </p>
            </div>
          </div>
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            className={isConnected ? "gap-2 border-green-200 text-green-700 hover:text-green-800" : "gap-2 bg-[#1877F2] hover:bg-[#166fe5]"}
            onClick={() => navigate('/settings/integrations')}
          >
            {isConnected ? <CheckCircle2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {isConnected ? 'Manage Connection' : 'Connect Account'}
          </Button>
        </CardContent>
      </Card>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Reach</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#1877F2]" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">-- from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Ad Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">-- from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Link Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MousePointer2 className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">0</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">-- from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List Placeholder */}
      {isConnected ? (
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Campaigns</CardTitle>
                <CardDescription>Real-time performance of your Meta ads</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/marketing/ads')}>
                View All Campaigns
              </Button>
            </CardHeader>
            {/* We could potentially show a preview of campaigns here, but linking to the dashboard is safer for now */}
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns</CardTitle>
              <CardDescription>Real-time performance of your Meta ads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Facebook className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No active ad campaigns found.</p>
                <Button variant="link" className="text-[#1877F2]" onClick={() => navigate('/settings/integrations')}>Connect Account to Sync</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <CreateAdDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        organisation={organisation}
      />
    </div>
  )
}
