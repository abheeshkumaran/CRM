import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Webhook, Slack, MessageSquare, CheckCircle2, Phone, MessageCircle } from "lucide-react"
import { getOrganisation } from "@/services/settingsService"
import { IntegrationConfigDialog } from "@/components/settings/IntegrationConfigDialog"
import { Badge } from "@/components/ui/badge"

export default function IntegrationsSettingsPage() {
  const [configOpen, setConfigOpen] = useState<'meta' | 'slack' | 'twilio' | 'whatsapp' | null>(null)

  const { data: organisation, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  })

  const integrations = organisation?.integrations || {}

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Integrations</h1>
              <p className="text-gray-500">Manage connections with third-party tools.</p>
            </div>

            {isLoading ? (
              <div>Loading settings...</div>
            ) : (
              <div className="grid gap-4">
                {/* Meta Integration */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                <div className="flex items-center gap-2">
                          <CardTitle className="text-base">Meta (Facebook/Instagram)</CardTitle>
                          {integrations.meta?.connected && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                        </div>
                        <CardDescription>Sync leads from Facebook Forms and manage ads</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setConfigOpen('meta')}>
                      {integrations.meta?.connected ? 'Manage' : 'Connect'}
                    </Button>
                  </CardHeader>
                </Card>

                {/* WhatsApp Integration */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <MessageCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">WhatsApp Business</CardTitle>
                          {integrations.whatsapp?.connected && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                        </div>
                        <CardDescription>Send and receive WhatsApp messages</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setConfigOpen('whatsapp')}>
                      {integrations.whatsapp?.connected ? 'Manage' : 'Connect'}
                    </Button>
                  </CardHeader>
                </Card>

                {/* Slack Integration */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Slack className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">Slack</CardTitle>
                          {integrations.slack?.connected && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                        </div>
                        <CardDescription>Receive notifications in Slack channels</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setConfigOpen('slack')}>
                      {integrations.slack?.connected ? 'Manage' : 'Connect'}
                    </Button>
                  </CardHeader>
                </Card>

                {/* Twilio Integration */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <Phone className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">Twilio</CardTitle>
                          {integrations.twilio?.connected && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Connected</Badge>}
                        </div>
                        <CardDescription>Make/Receive calls via Cloud VoIP</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setConfigOpen('twilio')}>
                      {integrations.twilio?.connected ? 'Manage' : 'Connect'}
                    </Button>
                  </CardHeader>
                </Card>

                {/* Webhooks */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Webhook className="h-6 w-6 text-orange-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Webhooks</CardTitle>
                        <CardDescription>Send data to external URLs on events</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => window.location.href = "/settings/developer?tab=webhooks"}>
                      Manage Webhooks
                    </Button>
                  </CardHeader>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {configOpen && (
        <IntegrationConfigDialog
          open={!!configOpen}
          onOpenChange={(open) => !open && setConfigOpen(null)}
          integrationType={configOpen}
          initialValues={integrations[configOpen]}
        />
      )}
    </div>
  )
}
