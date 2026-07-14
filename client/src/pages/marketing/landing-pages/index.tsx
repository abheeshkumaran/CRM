import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLandingPages, createLandingPage, deleteLandingPage, updateLandingPage, type LandingPage } from "@/services/landingPageService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Globe, Eye, MousePointerClick, ExternalLink, MoreVertical, CheckCircle, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LandingPagesManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<LandingPage | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    html: "",
  });

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['landing-pages'],
    queryFn: getLandingPages
  });

  const createMutation = useMutation({
    mutationFn: createLandingPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setIsDialogOpen(false);
      setFormData({ name: "", slug: "" });
      toast.success("Page created successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to create page");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteLandingPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success("Page deleted");
    },
    onError: () => {
      toast.error("Failed to delete page");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'draft' | 'published' | 'archived' }) => 
      updateLandingPage(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    }
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; html: string } }) => 
      updateLandingPage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-pages'] });
      setIsEditDialogOpen(false);
      setEditingPage(null);
      toast.success("Content updated");
    },
    onError: () => {
      toast.error("Failed to update content");
    }
  });

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) return;
    createMutation.mutate(formData);
  };

  const handleEditClick = (page: LandingPage) => {
    setEditingPage(page);
    setEditFormData({
      name: page.name,
      html: page.html || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateContent = () => {
    if (!editingPage) return;
    updateContentMutation.mutate({
      id: editingPage.id,
      data: editFormData,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Landing Pages</h1>
          <p className="text-gray-500 mt-1">Create and manage high-converting landing pages.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Create Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Landing Page</DialogTitle>
              <DialogDescription>
                Start with a blank page. You can edit the content later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Page Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Summer Promo"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    // Auto-generate slug from name if slug is empty or matches previous slug
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData(prev => ({ ...prev, name, slug: prev.slug && prev.slug !== slug ? prev.slug : slug }));
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-1">/</span>
                  <Input
                    id="slug"
                    placeholder="summer-promo"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Page'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Pages</CardTitle>
          <CardDescription>Track performance and manage content.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">Loading pages...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Name / URL</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.length > 0 ? (
                  pages.map((item: LandingPage) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'published' ? 'default' : 'secondary'
                          }
                          className={item.status === 'published' ? 'bg-purple-600' : ''}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          /{item.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3 text-gray-400" />
                          {item.views}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3 text-gray-400" />
                          {item.conversions}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => window.open(`/pages/${item.slug}`, '_blank')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditClick(item)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Content
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {item.status !== 'published' && (
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'published' })}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              {item.status === 'published' && (
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: item.id, status: 'draft' })}>
                                  Unpublish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => deleteMutation.mutate(item.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No pages found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Content Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Landing Page Content</DialogTitle>
            <DialogDescription>
              Add HTML content for your landing page. You can use any HTML, CSS, and inline JavaScript.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Page Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-html">HTML Content</Label>
              <Textarea
                id="edit-html"
                placeholder="Enter your HTML content here..."
                value={editFormData.html}
                onChange={(e) => setEditFormData({ ...editFormData, html: e.target.value })}
                className="font-mono text-sm min-h-[400px]"
              />
              <p className="text-xs text-muted-foreground">
                Tip: You can paste complete HTML including styles and scripts. The content will be rendered as-is.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateContent} disabled={updateContentMutation.isPending}>
              {updateContentMutation.isPending ? 'Saving...' : 'Save Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
