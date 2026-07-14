import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Brain, Settings2, Sparkles } from "lucide-react"
import { getOrganisation } from "@/services/settingsService"
import { LeadScoringDialog } from "@/components/shared/LeadScoringDialog"

export default function LeadScoringSettingsPage() {
  const [isConfigOpen, setIsConfigOpen] = useState(false)

  const { data: organisation } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Lead Scoring</h1>
              <p className="text-gray-500">Configure AI-driven scoring models for your leads.</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-purple-500" />Scoring Model</CardTitle>
                <CardDescription>Define how leads are prioritized.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300">AI Scoring Active</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Our machine learning model is currently analyzing your lead interactions to assign scores automatically.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 py-4">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-center">
                    <span className="block text-xl font-bold">{organisation?.leadScoringConfig?.emailOpened || 1}</span>
                    <span className="text-xs text-gray-500 uppercase">Email Open</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-center">
                    <span className="block text-xl font-bold">{organisation?.leadScoringConfig?.linkClicked || 3}</span>
                    <span className="text-xs text-gray-500 uppercase">Link Click</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-center">
                    <span className="block text-xl font-bold">{organisation?.leadScoringConfig?.formSubmitted || 5}</span>
                    <span className="text-xs text-gray-500 uppercase">Form Submit</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-center">
                    <span className="block text-xl font-bold">{organisation?.leadScoringConfig?.callConnected || 10}</span>
                    <span className="text-xs text-gray-500 uppercase">Call Connected</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md text-center">
                    <span className="block text-xl font-bold">{organisation?.leadScoringConfig?.websiteVisit || 1}</span>
                    <span className="text-xs text-gray-500 uppercase">Web Visit</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsConfigOpen(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure Weights
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <LeadScoringDialog
        open={isConfigOpen}
        onOpenChange={setIsConfigOpen}
        initialValues={organisation?.leadScoringConfig}
      />
    </div>
  )
}
