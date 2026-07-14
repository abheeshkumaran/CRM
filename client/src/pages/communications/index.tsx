import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getInteractions, type Interaction } from "@/services/interactionService"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import { format } from "date-fns"
import { Phone, Mail, Users, MessageSquare } from "lucide-react"

import { LogInteractionDialog } from "@/components/Communications/LogInteractionDialog";
import { useQueryClient } from "@tanstack/react-query";

export default function CommunicationsPage() {
  const [filterType, setFilterType] = useState<string>("")
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: interactionsData, isLoading, isError } = useQuery({
    queryKey: ['interactions', filterType],
    queryFn: () => getInteractions({ type: (filterType as 'call' | 'email' | 'meeting' | '') || undefined }),
  })

  const interactions = (interactionsData?.interactions || []).filter((i: Interaction) => i && typeof i === 'object');

  const getIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  }

  if (isError) {
    return (
      <div className="flex h-full overflow-hidden bg-[#0f172a]">

        <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
          <div className="text-red-500 mb-4">Error loading communications. Please try again.</div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#0f172a]">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Communications Hub</h1>
                <p className="text-indigo-300/70 mt-1">Central feed of all customer interactions.</p>
              </div>
              <Button onClick={() => setInteractionDialogOpen(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl">Log Interaction</Button>
            </div>
            <LogInteractionDialog
              open={interactionDialogOpen}
              onOpenChange={setInteractionDialogOpen}
              onSuccess={() => {
                // Invalidate queries to refresh list
                queryClient.invalidateQueries({ queryKey: ['interactions'] });
              }}
            />

            <div className="flex space-x-2">
              <Button variant={filterType === "" ? "default" : "outline"} size="sm" onClick={() => setFilterType("")} className={`rounded-full ${filterType === "" ? "bg-indigo-600 text-white" : "border-indigo-900/50 text-indigo-300 hover:text-white"}`}>All</Button>
              <Button variant={filterType === "call" ? "default" : "outline"} size="sm" onClick={() => setFilterType("call")} className={`rounded-full ${filterType === "call" ? "bg-indigo-600 text-white" : "border-indigo-900/50 text-indigo-300 hover:text-white"}`}>Calls</Button>
              <Button variant={filterType === "email" ? "default" : "outline"} size="sm" onClick={() => setFilterType("email")} className={`rounded-full ${filterType === "email" ? "bg-indigo-600 text-white" : "border-indigo-900/50 text-indigo-300 hover:text-white"}`}>Emails</Button>
              <Button variant={filterType === "meeting" ? "default" : "outline"} size="sm" onClick={() => setFilterType("meeting")} className={`rounded-full ${filterType === "meeting" ? "bg-indigo-600 text-white" : "border-indigo-900/50 text-indigo-300 hover:text-white"}`}>Meetings</Button>
            </div>

            <div className="space-y-6 relative border-l-2 border-indigo-900/50 ml-4 pl-8 py-2">
              {isLoading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center p-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-10 w-10 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                      <p className="text-sm text-indigo-300/70">Loading interactions...</p>
                    </div>
                  </div>
                </div>
              ) : (
                interactions.map((interaction: Interaction) => (
                  <div key={interaction.id} className="relative mb-8 last:mb-0">
                    <div className="absolute -left-[41px] top-0 bg-[#0f172a] border border-indigo-900/50 rounded-full p-2 text-indigo-400">
                      {getIcon(interaction.type)}
                    </div>

                    <Card className="shadow-lg shadow-indigo-950/20 hover:shadow-indigo-900/40 transition-shadow border-indigo-900/50 bg-[#1e1b4b]">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-white">{interaction.subject}</h3>
                            <div className="text-sm text-indigo-300/60 mt-1 flex flex-wrap items-center gap-2">
                              <span className={`capitalize px-2 py-0.5 rounded text-xs font-bold ${interaction.direction === 'inbound' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                                }`}>
                                {interaction.direction} {interaction.type}
                              </span>
                              <span className="hidden sm:inline">&bull;</span>
                              <span>with <span className="font-medium text-indigo-100">{interaction.relatedTo?.name || `${interaction.relatedTo?.firstName} ${interaction.relatedTo?.lastName}`}</span></span>
                              <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-indigo-300/50">({interaction.onModel})</span>
                            </div>
                          </div>
                          <div className="text-sm text-indigo-400/60 text-right">
                            <div className="text-white">{format(new Date(interaction.date), "MMM d, h:mm a")}</div>
                            <div className="text-xs mt-0.5">by {interaction.createdBy?.firstName}</div>
                          </div>
                        </div>
                        {interaction.description && (
                          <p className="mt-3 text-sm text-indigo-100/80 bg-white/5 p-3 rounded-md border border-indigo-900/50">
                            {interaction.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
              {!isLoading && interactions.length === 0 && (
                <div className="text-center py-12">
                  <div className="h-12 w-12 rounded-full bg-[#1e1b4b] border border-indigo-900/50 flex items-center justify-center mx-auto mb-4 text-indigo-400">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-indigo-300/70">No interactions found. Log one to get started.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div >
    </div >
  )
}
