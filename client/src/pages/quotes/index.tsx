import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getQuotes, deleteQuote, type Quote } from "@/services/quoteService"
import { CreateQuoteDialog } from "@/components/CreateQuoteDialog"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, FileText, DollarSign, CheckCircle, Trash2, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-yellow-100 text-yellow-800',
}

export default function QuotesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quotes', searchQuery],
    queryFn: () => getQuotes({ search: searchQuery }),
  })

  const quotes = data?.quotes || []

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteQuote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  })

  const totalValue = quotes.reduce((acc: number, q: Quote) => acc + q.grandTotal, 0)
  const acceptedCount = quotes.filter((q: Quote) => q.status === 'accepted').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Quotes</h1>
                <p className="text-muted-foreground mt-1">Create and manage customer quotes</p>
              </div>
              <CreateQuoteDialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <Button className="shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
              </CreateQuoteDialog>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{quotes.length}</p>
                    <p className="text-xs text-muted-foreground">Total Quotes</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">${totalValue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Total Value</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{acceptedCount}</p>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search quotes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* Quotes List */}
            {isLoading ? (
              <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-12 text-gray-500"><FileText className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No quotes found.</p></div>
            ) : (
              <div className="space-y-4">
                {quotes.map((quote: Quote) => (
                  <Card key={quote.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{quote.title}</h3>
                            <Badge className={statusColors[quote.status]}>{quote.status}</Badge>
                          </div>
                          <p className="text-sm text-gray-500">{quote.quoteNumber}</p>
                          {quote.account && <p className="text-sm text-gray-500 mt-1">Account: {quote.account.name}</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">${quote.grandTotal.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Valid until: {format(new Date(quote.validUntil), 'MMM d, yyyy')}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(quote.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
