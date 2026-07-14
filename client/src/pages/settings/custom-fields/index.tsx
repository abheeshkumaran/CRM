import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings2, Database, Trash2, Edit2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getCustomFields, createCustomField, deleteCustomField } from '@/services/settingsService'

interface CustomField {
  id: string
  name: string
  label: string
  fieldType: string
  entityType: string
  isActive: boolean
  isRequired: boolean
}

interface CustomFieldData {
  name: string
  label: string
  fieldType: string
  entityType: string
}

export default function CustomFieldsSettingsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: customFields = [], isLoading } = useQuery<CustomField[]>({
    queryKey: ['customFields'],
    queryFn: () => getCustomFields()
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCustomField(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] })
      toast.success('Custom field deleted')
    }
  })

  const createMutation = useMutation({
    mutationFn: (data: CustomFieldData) => createCustomField(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] })
      setIsDialogOpen(false)
      toast.success('Custom field created')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create custom field')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      name: formData.get('name') as string,
      label: formData.get('label') as string,
      fieldType: formData.get('fieldType') as string,
      entityType: formData.get('entityType') as string
    })
  }

  const fieldsByEntity = useMemo(() => {
    // Handle both object with customFields array and direct array response with robust null checks
    let fields: CustomField[] = [];

    if (Array.isArray(customFields)) {
      fields = customFields;
    } else if (customFields && typeof customFields === 'object' && 'customFields' in customFields && Array.isArray((customFields as any).customFields)) {
      fields = (customFields as any).customFields;
    }

    // Defensive reduce that skips invalid field objects
    return fields.reduce((acc: Record<string, CustomField[]>, field: CustomField) => {
      if (!field) return acc;
      const entity = field.entityType || 'Other'
      if (!acc[entity]) acc[entity] = []
      acc[entity].push(field)
      return acc
    }, {})
  }, [customFields])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings2 className="h-8 w-8 text-primary" />
            Custom Fields
          </h1>
          <p className="text-muted-foreground">Define custom fields for your leads, contacts, and other entities.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Create Custom Field</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="entityType">Entity Type</Label>
                  <Select name="entityType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select entity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Lead">Lead</SelectItem>
                      <SelectItem value="Contact">Contact</SelectItem>
                      <SelectItem value="Account">Account</SelectItem>
                      <SelectItem value="Opportunity">Opportunity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Field Name (ID)</Label>
                  <Input id="name" name="name" placeholder="e.g. custom_source" required pattern="^[a-zA-Z_][a-zA-Z0-9_]*$" />
                  <p className="text-[10px] text-muted-foreground">Only letters, numbers and underscores. Must start with a letter.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="label">Display Label</Label>
                  <Input id="label" name="label" placeholder="e.g. Lead Source ID" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fieldType">Field Type</Label>
                  <Select name="fieldType" defaultValue="text" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="boolean">Boolean (Yes/No)</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="textarea">Long Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Field"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {Object.entries(fieldsByEntity).length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No custom fields defined</h3>
              <p className="text-muted-foreground max-w-sm">
                Create your first custom field to start capturing more data for your leads and contacts.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(fieldsByEntity).map(([entity, fields]) => (
            <Card key={entity} className="border-border bg-card">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {entity}
                  </Badge>
                  Fields
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {fields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Database className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.label}</span>
                            <Badge variant="secondary" className="text-[10px] h-4 uppercase">
                              {field.fieldType}
                            </Badge>
                          </div>
                          <code className="text-[10px] text-muted-foreground">ID: {field.name}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this custom field?')) {
                              deleteMutation.mutate(field.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
