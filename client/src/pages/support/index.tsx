import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getCases, createCase, updateCase, type Case, type CaseInput } from "@/services/caseService"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Headphones, Clock, CheckCircle, AlertCircle, MoreVertical, User, ArrowUp } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  open: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300',
  in_progress: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  resolved: 'bg-green-500/15 text-green-700 dark:text-green-300',
  closed: 'bg-muted text-muted-foreground'
}
const priorityColors: Record<string, string> = {
  low: 'text-muted-foreground',
  medium: 'text-yellow-600 dark:text-yellow-400',
  high: 'text-orange-600 dark:text-orange-400',
  critical: 'text-destructive'
}

export default function SupportPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: casesData, isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => getCases()
  })

  const cases = casesData?.cases || []

  const createMutation = useMutation({
    mutationFn: (data: CaseInput) => createCase(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      setIsDialogOpen(false)
      toast.success('Support case created and assigned to your manager')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<CaseInput> }) => updateCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Case updated successfully')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      subject: formData.get('subject') as string,
      description: formData.get('description') as string,
      type: formData.get('type') as 'question' | 'problem' | 'feature_request',
      priority: formData.get('priority') as 'low' | 'medium' | 'high' | 'critical',
      status: 'new'
    })
  }

  const handleResolve = (caseId: string) => {
    updateMutation.mutate({
      id: caseId,
      data: { status: 'resolved' }
    })
  }

  const handleStatusChange = (caseId: string, status: 'new' | 'open' | 'in_progress' | 'resolved' | 'closed') => {
    updateMutation.mutate({
      id: caseId,
      data: { status }
    })
  }

  const openCases = cases.filter((c: Case) => ['new', 'open', 'in_progress'].includes(c.status)).length
  const resolvedCases = cases.filter((c: Case) => c.status === 'resolved').length
  const criticalCases = cases.filter((c: Case) => c.priority === 'critical').length

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div><h1 className="text-3xl font-bold text-foreground">Support</h1><p className="text-muted-foreground">Manage customer support cases</p></div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild><Button className="shadow-lg shadow-primary/20"><Plus className="h-4 w-4 mr-2" />New Case</Button></DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Create Support Case</DialogTitle>
                      <DialogDescription>Submit a new support case for assistance.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div><Label>Subject</Label><Input name="subject" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>Type</Label><Select name="type" defaultValue="question"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="question">Question</SelectItem><SelectItem value="problem">Problem</SelectItem><SelectItem value="feature_request">Feature Request</SelectItem></SelectContent></Select></div>
                        <div><Label>Priority</Label><Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select></div>
                      </div>
                      <div><Label>Description</Label><Textarea name="description" rows={4} /></div>
                    </div>
                    <DialogFooter><Button type="submit">Create Case</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Headphones className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{cases.length}</p>
                    <p className="text-xs text-muted-foreground">Total Cases</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{openCases}</p>
                    <p className="text-xs text-muted-foreground">Open Cases</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{resolvedCases}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{criticalCases}</p>
                    <p className="text-xs text-muted-foreground">Critical</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cases List */}
            <Card>
              <CardHeader><CardTitle>All Cases</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-12"><div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><Headphones className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No support cases yet</p></div>
                ) : (
                  <div className="space-y-3">
                    {cases.map((c: Case) => (
                      <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Headphones className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2"><p className="font-semibold text-foreground">{c.subject}</p><Badge className={statusColors[c.status]}>{c.status.replace('_', ' ')}</Badge></div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span>{c.caseNumber}</span>
                              <span className={priorityColors[c.priority]}>• {c.priority}</span>
                              {c.assignedTo && <span>• <User className="h-3 w-3 inline" /> Assigned to: {c.assignedTo.firstName} {c.assignedTo.lastName}</span>}
                              {c.contact && <span>• Contact: {c.contact.firstName} {c.contact.lastName}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="hover:bg-muted"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {c.status !== 'resolved' && c.status !== 'closed' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(c.id, 'in_progress')}>
                                    <Clock className="h-4 w-4 mr-2" />Set In Progress
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleResolve(c.id)}>
                                    <CheckCircle className="h-4 w-4 mr-2" />Mark as Resolved
                                  </DropdownMenuItem>
                                </>
                              )}
                              {c.status === 'resolved' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(c.id, 'closed')}>
                                  <CheckCircle className="h-4 w-4 mr-2" />Close Case
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
