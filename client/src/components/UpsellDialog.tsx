import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface UpsellDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  onSuccess?: () => void;
}

export function UpsellDialog({ open, onOpenChange, accountId, onSuccess }: UpsellDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Form States
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [isFinalSale, setIsFinalSale] = useState(true);
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');

  // Fetch Products for selection
  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
    enabled: open
  });
  const products = productsData?.products || [];

  // Auto-fill price when product is selected
  useEffect(() => {
    if (productId) {
      const selectedProduct = products.find((p: any) => p.id === productId);
      if (selectedProduct) {
        setPrice(selectedProduct.basePrice || 0);
        setCustomName(selectedProduct.name || '');
      }
    }
  }, [productId, products]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setProductId('');
      setQuantity(1);
      setPrice(0);
      setIsFinalSale(true);
      setNotes('');
      setCustomName('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Please select a product');
      return;
    }

    setIsLoading(true);
    try {
      await api.post(`/accounts/${accountId}/products`, {
        productId,
        quantity,
        price,
        isFinalSale,
        notes,
        purchaseDate: new Date().toISOString(),
        status: 'active',
        customName
      });

      toast.success(isFinalSale ? 'Sale finalized and reflected in stats!' : 'Asset added to account');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to record purchase');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Finalize Sale / Upsell
          </DialogTitle>
          <DialogDescription>
            Select a product to sell to this account. This will record a purchase and optionally mark it as a finalized sale in your targets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Select Product</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Search products..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.isCustom ? "(Custom Price)" : `(₹${p.basePrice?.toLocaleString()})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="customName">Product Name</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Product name as it should appear on records"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price per Unit (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold text-green-800 dark:text-green-400">Finalize Sale</Label>
                <p className="text-xs text-green-700/70 dark:text-green-500/70">Reflect this in your total sales targets</p>
              </div>
              <Switch checked={isFinalSale} onCheckedChange={setIsFinalSale} />
            </div>

            <div className="grid gap-2 pt-2 border-t text-right">
              <span className="text-sm font-medium text-muted-foreground">Order Total:</span>
              <span className="text-2xl font-bold text-green-600">₹{(quantity * price).toLocaleString()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
