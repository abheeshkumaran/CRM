import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmailCampaigns } from "./components/EmailCampaigns"
import { MetaCampaigns } from "./components/MetaCampaigns"
import { WhatsAppCampaigns } from "./components/WhatsAppCampaigns"

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Marketing Studio</h1>
        <p className="text-indigo-300/60 mt-1">Multi-channel campaign management and automation.</p>
      </div>

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="bg-[#1e1b4b] border border-indigo-900/50 p-1 rounded-xl shadow-lg shadow-indigo-950/20">
          <TabsTrigger
            value="email"
            className="rounded-lg data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-indigo-300 transition-all"
          >
            Email Campaigns
          </TabsTrigger>
          <TabsTrigger
            value="meta"
            className="rounded-lg data-[state=active]:bg-[#1877F2] data-[state=active]:text-white text-indigo-300 transition-all"
          >
            Meta Ads
          </TabsTrigger>
          <TabsTrigger
            value="whatsapp"
            className="rounded-lg data-[state=active]:bg-[#25D366] data-[state=active]:text-white text-indigo-300 transition-all"
          >
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="outline-none focus-visible:ring-0">
          <EmailCampaigns />
        </TabsContent>

        <TabsContent value="meta" className="outline-none focus-visible:ring-0">
          <MetaCampaigns />
        </TabsContent>

        <TabsContent value="whatsapp" className="outline-none focus-visible:ring-0">
          <WhatsAppCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  )
}
