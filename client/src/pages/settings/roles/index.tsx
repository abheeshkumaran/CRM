import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getRoles, createRole, updateRole, deleteRole } from "@/services/settingsService"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Shield, Users, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react"

interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  userCount: number;
  permissions?: string[];
}

export default function RolesSettingsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "" })

  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles
  })

  const roles = data?.roles || []

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success("Role created successfully")
    },
    onError: () => toast.error("Failed to create role")
  })

  const updateMutation = useMutation({
    mutationFn: (data: { name: string, description: string }) => updateRole(editingRole!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      setIsDialogOpen(false)
      resetForm()
      toast.success("Role updated successfully")
    },
    onError: () => toast.error("Failed to update role")
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      toast.success("Role deleted successfully")
    },
    onError: () => toast.error("Failed to delete role (it might be assigned to users)")
  })

  const resetForm = () => {
    setEditingRole(null)
    setFormData({ name: "", description: "" })
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (role: Role) => {
    setEditingRole(role)
    setFormData({ name: role.name, description: role.description || "" })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingRole) {
      updateMutation.mutate(formData)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this role? This cannot be undone.")) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Roles & Permissions</h1>
                <p className="text-muted-foreground mt-1">Manage user roles and access levels</p>
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {isLoading ? (
                <div className="col-span-full flex justify-center p-12">
                  <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                </div>
              ) : roles.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No roles defined</p>
                </div>
              ) : (
                roles.map((role: Role) => (
                  <Card key={role.id} className="relative group overflow-hidden transition-all hover:shadow-md border-l-4 border-l-primary/50 hover:border-l-primary">
                    <CardHeader className="pl-6 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {role.name}
                            {role.isSystemRole && <Badge variant="secondary" className="text-xs font-normal">System</Badge>}
                          </CardTitle>
                          <CardDescription className="line-clamp-2 min-h-[40px]">
                            {role.description || 'No description provided.'}
                          </CardDescription>
                        </div>
                        {/* Edit/Delete actions */}
                        {!role.isSystemRole ? (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm rounded-md p-1 border">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(role)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(role.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm rounded-md p-1 border">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(role)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pl-6 pt-2">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-full">
                          <Users className="h-3.5 w-3.5 text-primary" />
                          <span className="font-medium text-foreground">{role.userCount || 0} Users</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span>Active</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Create/Edit Role Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent>
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                    <DialogDescription>
                      Define the role name and description. Permissions can be configured later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Role Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g. Sales Manager"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the responsibilities of this role..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending ? 'Saving...' : (editingRole ? 'Save Changes' : 'Create Role')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

          </div>
        </main>
      </div>
    </div>
  )
}
