
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { updateWorkflow, getWorkflowById, type CreateWorkflowData } from "@/services/workflowService"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"

export default function WorkflowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<CreateWorkflowData>({
    name: "",
    triggerEntity: "Lead",
    triggerEvent: "created",
    isActive: true,
    conditions: [],
    actions: []
  })
  const [error, setError] = useState<string | null>(null)

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => getWorkflowById(id!),
    enabled: !!id
  })

  useEffect(() => {
    if (workflow) {
      const timer = setTimeout(() => {
        setFormData({
          name: workflow.name,
          triggerEntity: workflow.triggerEntity,
          triggerEvent: workflow.triggerEvent,
          isActive: workflow.isActive,
          conditions: workflow.conditions,
          actions: workflow.actions
        })
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [workflow])

  const updateMutation = useMutation({
    mutationFn: (data: CreateWorkflowData) => updateWorkflow(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', id] })
      toast.success("Workflow updated successfully")
      navigate('/automation')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setError(err.response?.data?.message || "Failed to update workflow")
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError("Workflow name is required")
      return
    }

    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!workflow && !isLoading) {
    return <div className="p-8">Workflow not found</div>
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/automation')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Edit Automation</h1>
                <p className="text-gray-500">Modify your automation rule</p>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Workflow Details</CardTitle>
                    <CardDescription>Configuration for this automation rule</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="active-mode">Active</Label>
                    <Switch
                      id="active-mode"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-md flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Workflow Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g. New Lead Welcome Email"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trigger Entity</Label>
                      <Select
                        value={formData.triggerEntity}
                        onValueChange={(value) => setFormData({ ...formData, triggerEntity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Entity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Lead">Lead</SelectItem>
                          <SelectItem value="Contact">Contact</SelectItem>
                          <SelectItem value="Opportunity">Opportunity</SelectItem>
                          <SelectItem value="Task">Task</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Trigger Event</Label>
                      <Select
                        value={formData.triggerEvent}
                        onValueChange={(value) => setFormData({ ...formData, triggerEvent: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Event" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created">Created</SelectItem>
                          <SelectItem value="updated">Updated</SelectItem>
                          <SelectItem value="deleted">Deleted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => navigate('/automation')}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
