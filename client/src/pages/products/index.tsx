import { copyToClipboard, getUserInfo, isOrgAdmin, isAdmin } from "@/lib/utils";
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProducts, createProduct, deleteProduct, uploadBrochure, generateShareLink, updateProduct, type Product, type CreateProductData } from "@/services/productService"
import { getLeads, type Lead } from "@/services/leadService"
import { getAssetUrl } from "@/lib/utils"
import { useCurrency } from "@/contexts/CurrencyContext"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Package, DollarSign, Tag, Trash2, MoreHorizontal, Share2, FileText, Copy, Check, Edit } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProductsPage() {
  const user = getUserInfo();
  const orgAdmin = isOrgAdmin(user);
  const adminUser = isAdmin(user);
  const { formatCurrency } = useCurrency()
  const [searchQuery, setSearchQuery] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Share Dialog States
  const [isShareConfigOpen, setIsShareConfigOpen] = useState(false)
  const [isShareResultOpen, setIsShareResultOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string>("none")
  const [shareConfig, setShareConfig] = useState({
    youtubeUrl: "",
    customTitle: "",
    customDescription: ""
  })

  const [sharedLinkData, setSharedLinkData] = useState<{ url: string, slug: string, youtubeUrl?: string, customTitle?: string, customDescription?: string, views?: number } | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['products', searchQuery],
    queryFn: () => getProducts({ search: searchQuery, limit: 200 }),
  })

  const products = data?.products || []

  const createMutation = useMutation({
    mutationFn: (data: CreateProductData) => createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsDialogOpen(false)
      toast.success("Product created successfully")
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message || "Failed to create product")
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Partial<CreateProductData> }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsEditDialogOpen(false)
      setEditingProduct(null)
      toast.success("Product updated successfully")
    },
    onError: (error: { response?: { data?: { message?: string } }, message?: string }) => {
      const errorMessage = error.response?.data?.message || error.message || "Failed to update product";
      console.error("Update error:", error);
      toast.error(errorMessage);
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success("Product deleted")
    },
    onError: () => toast.error("Failed to delete product")
  })

  const shareMutation = useMutation({
    mutationFn: (data: { id: string, config: Record<string, unknown> }) => generateShareLink(data.id, data.config),
    onSuccess: (data) => {
      // Append leadId if selected
      let finalUrl = data.url
      if (selectedLeadId && selectedLeadId !== "none") {
        finalUrl += `?leadId=${selectedLeadId}`
      }
      setSharedLinkData({ ...data, url: finalUrl })
      setIsShareConfigOpen(false)
      setIsShareResultOpen(true)
      setIsCopied(false)
    },
    onError: () => toast.error("Failed to generate share link")
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Handle Brochure Upload
    const brochureFile = formData.get('brochure') as File
    let brochureUrl = undefined

    if (brochureFile && brochureFile.size > 0) {
      try {
        const uploadRes = await uploadBrochure(brochureFile)
        brochureUrl = uploadRes.url
      } catch (error: any) {
        const errorMessage = error.message || "Failed to upload brochure";
        toast.error(errorMessage);
        return
      }
    }

    createMutation.mutate({
      name: formData.get('name') as string,
      sku: formData.get('sku') as string || undefined,
      basePrice: parseFloat(formData.get('basePrice') as string) || 0,
      category: formData.get('category') as string || undefined,
      description: formData.get('description') as string || undefined,
      isCustom: formData.get('isCustom') === 'on',
      brochureUrl
    })
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return

    const formData = new FormData(e.currentTarget)

    // Handle Brochure Upload
    const brochureFile = formData.get('brochure') as File
    let brochureUrl = editingProduct.brochureUrl // Keep existing brochure by default

    if (brochureFile && brochureFile.size > 0) {
      try {
        const uploadRes = await uploadBrochure(brochureFile)
        brochureUrl = uploadRes.url
      } catch (error: any) {
        const errorMessage = error.message || "Failed to upload brochure";
        console.error("Brochure upload error:", error);
        toast.error(errorMessage);
        return
      }
    }

    const updateData: Partial<CreateProductData> = {
      name: formData.get('name') as string,
      sku: formData.get('sku') as string || undefined,
      basePrice: parseFloat(formData.get('basePrice') as string) || 0,
      category: formData.get('category') as string || undefined,
      description: formData.get('description') as string || undefined,
      isCustom: formData.get('isCustom') === 'on',
    };

    // Only include brochureUrl if it exists
    if (brochureUrl) {
      updateData.brochureUrl = brochureUrl;
    }

    updateMutation.mutate({
      id: editingProduct.id,
      data: updateData
    })
  }

  const handleEditClick = (product: Product) => {
    setEditingProduct(product)
    setIsEditDialogOpen(true)
  }

  const handleShareClick = async (product: Product) => {
    setSelectedProductId(product.id)
    setSelectedLeadId("none")
    setSharedLinkData(null) // Reset previous share data

    // Fetch leads
    try {
      const leadsData = await getLeads({ limit: 100 }) // Fetch top 100 leads for now
      setLeads(leadsData.leads || [])
    } catch (error) {
      console.error("Failed to fetch leads", error)
    }

    // Reset to defaults first
    setShareConfig({
      youtubeUrl: "",
      customTitle: product.name,
      customDescription: product.description || ""
    })

    try {
      // Fetch existing share config
      const { getShareConfig } = await import("@/services/productService");
      const existingConfig = await getShareConfig(product.id);

      if (existingConfig.slug) {
        setShareConfig({
          youtubeUrl: existingConfig.youtubeUrl || "",
          customTitle: existingConfig.customTitle || product.name,
          customDescription: existingConfig.customDescription || product.description || ""
        })
        setSharedLinkData(existingConfig) // Set existing link data so we can show result immediately if wanted, but for now just prep config
      }
    } catch (error) {
      console.error("Failed to fetch share config", error)
    }

    setIsShareConfigOpen(true)
  }

  const handleGenerateLink = () => {
    if (!selectedProductId) return

    // Include leadId in config if selected
    const configWithLead = {
      ...shareConfig,
      ...(selectedLeadId && selectedLeadId !== "none" ? { leadId: selectedLeadId } : {})
    }

    shareMutation.mutate({
      id: selectedProductId,
      config: configWithLead
    })
  }

  const handleCopy = () => {
    if (sharedLinkData?.url) {
      copyToClipboard(sharedLinkData.url)
      setIsCopied(true)
      toast.success("Link copied to clipboard")
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const totalValue = products.reduce((acc: number, p: Product) => acc + p.basePrice, 0)
  const activeCount = products.filter((p: Product) => p.isActive).length

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Products</h1>
                <p className="text-muted-foreground mt-1">Manage your product catalog</p>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                {orgAdmin && (
                  <DialogTrigger asChild>
                    <Button className="shadow-lg shadow-primary/25"><Plus className="h-4 w-4 mr-2" />Add Product</Button>
                  </DialogTrigger>
                )}
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>Create a new product with details and optional brochure.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div><Label>Name</Label><Input name="name" required /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>SKU</Label><Input name="sku" placeholder="Optional" /></div>
                        <div><Label>Price</Label><Input name="basePrice" type="number" step="0.01" required /></div>
                      </div>
                      <div><Label>Category</Label><Input name="category" /></div>
                      <div><Label>Description</Label><Input name="description" /></div>
                      <div className="flex items-center gap-2 pt-2">
                        <input type="checkbox" name="isCustom" id="isCustom-add" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
                        <Label htmlFor="isCustom-add" className="cursor-pointer">Custom Price (Price will be entered at time of sale)</Label>
                      </div>
                      <div>
                        <Label>Brochure (PDF/Image)</Label>
                        <Input name="brochure" type="file" accept=".pdf,image/*" className="cursor-pointer" />
                        <p className="text-xs text-muted-foreground mt-1">Upload a product brochure to share with customers.</p>
                      </div>
                    </div>
                    <DialogFooter><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Add Product'}</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Product Dialog */}
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                  <form onSubmit={handleEditSubmit}>
                    <DialogHeader>
                      <DialogTitle>Edit Product</DialogTitle>
                      <DialogDescription>Update product details including name, price, category, and brochure.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div><Label>Name</Label><Input name="name" defaultValue={editingProduct?.name} required /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><Label>SKU</Label><Input name="sku" defaultValue={editingProduct?.sku} placeholder="Optional" /></div>
                        <div><Label>Price</Label><Input name="basePrice" type="number" step="0.01" defaultValue={editingProduct?.basePrice} required /></div>
                      </div>
                      <div><Label>Category</Label><Input name="category" defaultValue={editingProduct?.category} /></div>
                      <div><Label>Description</Label><Input name="description" defaultValue={editingProduct?.description} /></div>
                      <div className="flex items-center gap-2 pt-2">
                        <input 
                          type="checkbox" 
                          name="isCustom" 
                          id="isCustom-edit" 
                          defaultChecked={editingProduct?.isCustom}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                        />
                        <Label htmlFor="isCustom-edit" className="cursor-pointer">Custom Price (Price will be entered at time of sale)</Label>
                      </div>
                      <div>
                        <Label>Brochure (PDF/Image)</Label>
                        {editingProduct?.brochureUrl && (
                          <div className="mb-2 text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Current: {editingProduct.brochureUrl.split('/').pop()}</span>
                          </div>
                        )}
                        <Input name="brochure" type="file" accept=".pdf,image/*" className="cursor-pointer" />
                        <p className="text-xs text-muted-foreground mt-1">Upload a new brochure to replace the existing one (optional).</p>
                      </div>
                    </div>
                    <DialogFooter><Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Updating...' : 'Update Product'}</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Share Configuration Dialog */}
              <Dialog open={isShareConfigOpen} onOpenChange={setIsShareConfigOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                      Customize Share Link
                      {sharedLinkData?.views !== undefined && (
                        <Badge variant="secondary" className="ml-2">
                          {sharedLinkData.views} Views
                        </Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>Configure your shareable product link with custom content and tracking.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label>Select Lead (Optional)</Label>
                      <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lead to track views" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None (Generic Link)</SelectItem>
                          {leads.map((lead) => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.firstName} {lead.lastName} {lead.company ? `(${lead.company})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">If selected, you'll be notified when this specific lead views the product.</p>
                    </div>
                    <div>
                      <Label>YouTube Video URL (Optional)</Label>
                      <Input
                        placeholder="https://youtu.be/..."
                        value={shareConfig.youtubeUrl}
                        onChange={(e) => setShareConfig({ ...shareConfig, youtubeUrl: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Video will be embedded on the shared page.</p>
                    </div>
                    <div>
                      <Label>Custom Title</Label>
                      <Input
                        value={shareConfig.customTitle}
                        onChange={(e) => setShareConfig({ ...shareConfig, customTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Custom Description</Label>
                      <Input
                        value={shareConfig.customDescription}
                        onChange={(e) => setShareConfig({ ...shareConfig, customDescription: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleGenerateLink} disabled={shareMutation.isPending}>
                      {shareMutation.isPending ? 'Generating...' : 'Generate Link'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Share Result Dialog */}
              <Dialog open={isShareResultOpen} onOpenChange={setIsShareResultOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Share Product</DialogTitle>
                    <DialogDescription>Copy this link to share your product with customers.</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center space-x-2">
                    <div className="grid flex-1 gap-2">
                      <Label htmlFor="link" className="sr-only">Link</Label>
                      <Input id="link" defaultValue={sharedLinkData?.url} readOnly />
                    </div>
                    <Button type="button" size="sm" className="px-3" onClick={handleCopy}>
                      <span className="sr-only">Copy</span>
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <div className="text-sm text-muted-foreground">
                      Anyone with this link can view the product details, video, and brochure.
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{products.length}</p>
                    <p className="text-xs text-muted-foreground">Total Products</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Total Catalog Value</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                    <p className="text-xs text-muted-foreground">Active Products</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>

            {/* Products Grid */}
            {
              isLoading ? (
                <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500"><Package className="h-12 w-12 mx-auto mb-3 opacity-20" /><p>No products found.</p></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {products.map((product: Product) => (
                    <Card key={product.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-foreground">{product.name}</h3>
                            {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {orgAdmin && (
                                <DropdownMenuItem onClick={() => handleEditClick(product)}>
                                  <Edit className="h-4 w-4 mr-2" />Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleShareClick(product)}>
                                <Share2 className="h-4 w-4 mr-2" />Share
                              </DropdownMenuItem>
                              {product.brochureUrl && (
                                <DropdownMenuItem onClick={() => window.open(getAssetUrl(product.brochureUrl), '_blank')}>
                                  <FileText className="h-4 w-4 mr-2" />View Brochure
                                </DropdownMenuItem>
                              )}
                              {adminUser && (
                                <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(product.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-xl font-bold text-primary">
                            {product.isCustom ? "Custom Price" : formatCurrency(product.basePrice)}
                          </span>
                          <div className="flex gap-2">
                            {product.isCustom && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Custom</Badge>}
                            <Badge variant={product.isActive ? "default" : "secondary"}>{product.isActive ? "Active" : "Inactive"}</Badge>
                          </div>
                        </div>
                        {product.category && <Badge variant="outline" className="mt-2">{product.category}</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            }
          </div >
        </main >
      </div >
    </div >
  )
}
