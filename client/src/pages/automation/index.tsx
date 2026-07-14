import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { getWorkflows, updateWorkflow, deleteWorkflow, type Workflow } from "@/services/workflowService"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Zap,
  TrendingUp,
  Mail
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function AutomationPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', searchQuery],
    queryFn: () => getWorkflows({}),
  })

  const workflows = data?.workflows || []

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateWorkflow(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  })

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return
    deleteMutation.mutate(id)
  }

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, isActive: !currentStatus })
  }

  const activeWorkflowsCount = workflows.filter((w: Workflow) => w.isActive).length
  const totalExecutions = workflows.reduce((acc: number, curr: Workflow) => acc + (curr.executionCount || 0), 0)


  return (
    <div className="space-y-6">
      {/* Header */}
      < div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4" >
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Automation
          </h1>
          <p className="text-muted-foreground mt-1">Automate your sales and marketing processes</p>
        </div>
        <div className="flex gap-2">
          <Link to="/automation/new">
            <Button className="shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </Link>
        </div>
      </div >

      {/* Stats */}
      < div className="grid gap-4 md:grid-cols-4" >
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeWorkflowsCount}</p>
              <p className="text-sm text-muted-foreground">Active Automations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalExecutions}</p>
              <p className="text-sm text-muted-foreground">Total Executions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">-</p>
              <p className="text-sm text-muted-foreground">Emails Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-70">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">-</p>
              <p className="text-sm text-muted-foreground">Avg. Conversion</p>
            </div>
          </CardContent>
        </Card>
      </div >

      {/* Workflows List */}
      < Card >
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Triggers</CardTitle>
              <CardDescription>Automated actions triggered by CRM events</CardDescription>
            </div>
            <Link to="/automation/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Trigger
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : workflows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No active triggers found.</p>
              <Link to="/automation/new">
                <Button variant="link">Create your first trigger</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {workflows.map((trigger: Workflow) => (
                <div
                  key={trigger.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${trigger.isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{trigger.name}</p>
                        <Badge variant={trigger.isActive ? 'default' : 'secondary'}>
                          {trigger.isActive ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {trigger.triggerEntity}.{trigger.triggerEvent}
                        </Badge>
                        <span>{trigger.actions?.length || 0} actions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium">{trigger.executionCount?.toLocaleString() || 0}</p>
                      <p className="text-xs text-gray-500">executions</p>
                    </div>
                    <Switch
                      checked={trigger.isActive}
                      onCheckedChange={() => handleToggle(trigger.id, trigger.isActive)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Link to={`/automation/${trigger.id}`}>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem
                          className="text-red-600 cursor-pointer"
                          onClick={() => handleDelete(trigger.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card >
    </div >
  )
}
