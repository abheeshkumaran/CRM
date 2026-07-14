import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getProducts, type Product as BaseProduct } from "@/services/productService"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Check, ShoppingCart, Trash2, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useCurrency } from "@/contexts/CurrencyContext";

interface Product {
  id: string
  name: string
  basePrice: number
  sku: string
  isCustom: boolean
}

interface AddProductToLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leadId: string
  currentProducts?: { productId: string, quantity: number, price?: number, customName?: string, product?: Product }[]
  onSuccess: () => void
}

export function AddProductToLeadDialog({
  open,
  onOpenChange,
  leadId,
  currentProducts = [],
  onSuccess
}: AddProductToLeadDialogProps) {
  const { formatCurrency } = useCurrency();
  // Local state for selected products management
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string, product: Product, quantity: number, price: number, customName: string }[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      if (currentProducts.length > 0) {
        // Map existing products to state
        const mapped = currentProducts.map(p => ({
          productId: p.productId,
          product: p.product as Product, 
          quantity: p.quantity,
          price: p.price || p.product?.basePrice || 0,
          customName: p.customName || p.product?.name || ""
        })).filter(p => p.product) // Safety check
        setSelectedProducts(mapped)
      } else {
        setSelectedProducts([])
      }
    }
  }, [open, currentProducts])

  const { data: availableProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts({ limit: 1000 })
  })

  const handleAddProduct = (product: Product) => {
    // Check if already added
    if (selectedProducts.find(p => p.productId === product.id)) {
      toast.info("Product already added")
      return
    }
    setSelectedProducts([...selectedProducts, { 
      productId: product.id, 
      product, 
      quantity: 1, 
      price: product.basePrice || 0,
      customName: product.name || ""
    }])
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId))
  }

  const handleQuantityChange = (productId: string, qty: number) => {
    if (qty < 1) return
    setSelectedProducts(selectedProducts.map(p =>
      p.productId === productId ? { ...p, quantity: qty } : p
    ))
  }

  const handlePriceChange = (productId: string, price: number) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.productId === productId ? { ...p, price: price } : p
    ))
  }

  const handleNameChange = (productId: string, name: string) => {
    setSelectedProducts(selectedProducts.map(p =>
      p.productId === productId ? { ...p, customName: name } : p
    ))
  }

  const calculateTotal = () => {
    return selectedProducts.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }

  const handleSubmit = async () => {
    try {
      const payload = {
        products: selectedProducts.map(p => ({
          productId: p.productId,
          quantity: p.quantity,
          price: p.price,
          customName: p.customName
        }))
      }

      await api.put(`/leads/${leadId}`, payload)

      if (selectedProducts.length === 0) {
        toast.success("All products removed successfully")
      } else {
        toast.success("Products updated successfully")
      }

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      toast.error("Failed to update products")
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !max-h-none !m-0 !rounded-none !translate-x-0 !translate-y-0 !top-0 !left-0 sm:!fixed sm:!left-[50%] sm:!top-[50%] sm:!w-full sm:!max-w-[700px] sm:!h-[80vh] sm:!max-h-[80vh] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:!rounded-lg flex flex-col p-0 sm:p-6"
      >
        <DialogDescription className="sr-only">Select products to add to this lead.</DialogDescription>
        <DialogHeader className="p-4 sm:p-0 border-b sm:border-0 shrink-0">
          <DialogTitle>Manage Products</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-6 overflow-hidden px-4 sm:px-0 pt-4">
          {/* Left: Product Selection */}
          <div className="w-full lg:w-1/2 flex flex-col border rounded-md overflow-hidden h-[300px] lg:h-auto">
            <div className="p-3 bg-muted/50 border-b font-semibold text-xs uppercase tracking-wider flex items-center justify-between">
              Available Products
              <span className="text-[10px] lowercase font-normal bg-primary/10 text-primary px-1.5 py-0.5 rounded">select to add</span>
            </div>
            <div className="p-2 border-b">
              <div className="flex items-center border rounded-md px-3 bg-background">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input
                  className="border-none shadow-none focus-visible:ring-0 p-0 h-9 text-sm"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-1">
                {availableProducts?.products?.filter((p: Product) =>
                  (p.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                  (p.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">No products found.</div>
                ) : (
                  availableProducts?.products?.filter((p: Product) =>
                    (p.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (p.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase())
                  ).map((product: Product) => {
                    const isSelected = selectedProducts.some(p => p.productId === product.id)
                    return (
                      <div
                        key={product.id}
                        onClick={() => !isSelected && handleAddProduct(product)}
                        className={cn(
                          "flex items-center justify-between p-2.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-0",
                          isSelected && "opacity-50 cursor-not-allowed bg-muted/30"
                        )}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{product.name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{product.sku || 'No SKU'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">
                            {formatCurrency(product.basePrice, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-success" />}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Selected Products */}
          <div className="w-full lg:w-1/2 flex flex-col border rounded-md overflow-hidden min-h-0 flex-1 lg:h-auto">
            <div className="p-3 bg-muted/50 border-b font-semibold text-xs uppercase tracking-wider flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span>Selected</span>
                <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px] justify-center">{selectedProducts.length}</Badge>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground font-normal mr-2">Total:</span>
                <span className="text-primary font-bold">{formatCurrency(calculateTotal(), { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </div>
            </div>
            <ScrollArea className="flex-1 p-2 bg-muted/5">
              {selectedProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                  <ShoppingCart className="h-10 w-10 mb-2" />
                  <p className="text-sm">No products selected</p>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {selectedProducts.map((item) => (
                    <div key={item.productId} className="flex gap-2 items-start border p-3 rounded-lg bg-card shadow-sm">
                      <div className="flex-1 min-w-0">
                         {item.product.isCustom ? (
                           <div className="space-y-2">
                             <div className="flex flex-col gap-1">
                               <span className="text-[10px] text-muted-foreground font-medium">Product Name:</span>
                               <Input
                                 value={item.customName}
                                 onChange={(e) => handleNameChange(item.productId, e.target.value)}
                                 className="h-7 text-xs font-bold px-2"
                                 placeholder="Custom Product Name"
                               />
                             </div>
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">Price:</span>
                               <Input
                                 type="number"
                                 value={item.price}
                                 onChange={(e) => handlePriceChange(item.productId, parseFloat(e.target.value) || 0)}
                                 className="h-6 w-24 text-xs font-bold px-1"
                               />
                             </div>
                           </div>
                         ) : (
                           <>
                             <div className="font-bold text-sm truncate">{item.product.name}</div>
                             <div className="text-[10px] text-muted-foreground font-medium">Unit: {formatCurrency(item.price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
                           </>
                         )}
                       </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center border rounded-md h-7 overflow-hidden bg-background">
                            <button 
                              className="px-1.5 hover:bg-muted text-muted-foreground transition-colors"
                              onClick={(e) => { e.preventDefault(); handleQuantityChange(item.productId, Math.max(1, item.quantity - 1))}}
                            >-</button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                              className="h-full w-9 text-center border-0 border-x rounded-none px-0 shadow-none focus-visible:ring-0 text-xs font-bold"
                            />
                            <button 
                              className="px-1.5 hover:bg-muted text-muted-foreground transition-colors"
                              onClick={(e) => { e.preventDefault(); handleQuantityChange(item.productId, item.quantity + 1)}}
                            >+</button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => handleRemoveProduct(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-sm font-bold text-success">
                          {formatCurrency(item.price * item.quantity, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="mt-auto p-4 sm:p-0 border-t sm:border-0 bg-background sm:bg-transparent">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 sm:flex-none" onClick={handleSubmit}>Save Changes</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
