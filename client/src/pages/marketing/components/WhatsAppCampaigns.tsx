import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MessageCircle, Plus, ExternalLink, Users, MessageSquare, CheckCircle2, Send } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getOrganisation } from "@/services/settingsService"
import { useNavigate } from "react-router-dom"
import { getWhatsAppCampaigns, getWhatsAppStatistics } from "@/services/whatsAppService"

export function WhatsAppCampaigns() {
  const navigate = useNavigate();
  const { data: organisation } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  });

  const { data: campaigns } = useQuery({
    queryKey: ['whatsapp-campaigns'],
    queryFn: getWhatsAppCampaigns,
    enabled: !!organisation?.integrations?.whatsapp?.connected
  });

  const { data: statistics } = useQuery({
    queryKey: ['whatsapp-statistics'],
    queryFn: getWhatsAppStatistics,
    enabled: !!organisation?.integrations?.whatsapp?.connected
  });

  const isConnected = organisation?.integrations?.whatsapp?.connected;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">WhatsApp Business</h3>
          <p className="text-sm text-muted-foreground">Send messages and manage WhatsApp campaigns.</p>
        </div>
        <Button
          className="bg-[#25D366] hover:bg-[#20b858] text-white"
          onClick={() => navigate('/communications')}
          disabled={!isConnected}
        >
          <Plus className="mr-2 h-4 w-4" />
          Send Message
        </Button>
      </div>

      {/* Connection Status Card */}
      <Card className={`border ${isConnected ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-900'}`}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}>
              <MessageCircle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-200">{isConnected ? 'Connected' : 'Not Connected'}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected
                  ? 'Your WhatsApp Business API is connected and ready.'
                  : 'Connect your WhatsApp Business API to start messaging.'}
              </p>
            </div>
          </div>
          <Button
            variant={isConnected ? "outline" : "default"}
            size="sm"
            className={isConnected ? "gap-2 border-green-200 text-green-700 hover:text-green-800" : "gap-2 bg-[#25D366] hover:bg-[#20b858]"}
            onClick={() => navigate('/settings/integrations')}
          >
            {isConnected ? <CheckCircle2 className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
            {isConnected ? 'Manage Connection' : 'Connect Account'}
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-[#25D366]" />
              <span className="text-2xl font-bold">{statistics?.totalMessages || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {statistics?.directionBreakdown?.outgoing || 0} outgoing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Active Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">{statistics?.uniqueConversations || 0}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {statistics?.directionBreakdown?.incoming || 0} incoming
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-2xl font-bold">
                {statistics?.totalMessages > 0
                  ? Math.round(((statistics?.statusBreakdown?.delivered || 0) / statistics.totalMessages) * 100)
                  : 0}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {statistics?.statusBreakdown?.delivered || 0} delivered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign List */}
      {isConnected ? (
        <div className="grid gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Campaigns</CardTitle>
                <CardDescription>Your WhatsApp marketing campaigns</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/communications')}>
                View All Messages
              </Button>
            </CardHeader>
            <CardContent>
              {campaigns && campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map((campaign: { id: string, name: string, message: string, status: string, sentAt?: string, scheduledAt?: string, createdAt: string }) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{campaign.name}</h4>
                        <p className="text-sm text-gray-500">{campaign.message.substring(0, 50)}...</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                            campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {campaign.status}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() :
                            campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleDateString() :
                              new Date(campaign.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No campaigns found.</p>
                  <Button variant="link" className="text-[#25D366]" onClick={() => navigate('/communications')}>
                    Send Your First Message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Campaigns</CardTitle>
              <CardDescription>Send targeted messages to your contacts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Connect your WhatsApp Business API to start messaging.</p>
                <Button variant="link" className="text-[#25D366]" onClick={() => navigate('/settings/integrations')}>
                  Connect WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}