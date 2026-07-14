import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, DollarSign, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SetCustomPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  organisationName: string;
  currentPrice?: number;
  customPrice?: number | null;
  currency?: string;
}

export function SetCustomPriceDialog({
  open,
  onOpenChange,
  licenseId,
  organisationName,
  currentPrice = 0,
  customPrice = null,
  currency = 'INR'
}: SetCustomPriceDialogProps) {
  const [price, setPrice] = useState<string>(customPrice?.toString() || currentPrice.toString());
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (customPrice: number | null) => {
      const res = await api.patch(`/licenses/${licenseId}/custom-price`, { customPrice });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Custom pricing updated successfully');
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update custom pricing');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    mutation.mutate(numPrice);
  };

  const handleReset = () => {
    mutation.mutate(null);
  };

  const gstAmount = parseFloat(price) * 0.18;
  const totalWithGst = parseFloat(price) + gstAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f172a] border-indigo-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-indigo-400" />
            Set Custom Pricing
          </DialogTitle>
          <DialogDescription className="text-indigo-300">
            Override the standard plan price for <span className="font-semibold text-white">{organisationName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Alert className="bg-indigo-950/30 border-indigo-800">
            <Info className="h-4 w-4 text-indigo-400" />
            <AlertDescription className="text-indigo-300 text-sm">
              {customPrice !== null ? (
                <>Custom pricing is currently active. Standard plan price: {currency === 'INR' ? '₹' : '$'}{currentPrice}</>
              ) : (
                <>Currently using standard plan price: {currency === 'INR' ? '₹' : '$'}{currentPrice}</>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="customPrice" className="text-indigo-300">
              Custom Price Per User (before GST)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400">
                {currency === 'INR' ? '₹' : '$'}
              </span>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-8 bg-indigo-950/30 border-indigo-800 text-white"
                placeholder="Enter custom price per user"
                required
              />
            </div>
            <p className="text-xs text-indigo-400">
              This price will be multiplied by the number of active users
            </p>
          </div>

          {!isNaN(parseFloat(price)) && parseFloat(price) > 0 && (
            <div className="bg-indigo-950/30 p-4 rounded-lg space-y-2 border border-indigo-800">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-400">Base Amount:</span>
                <span className="text-white font-medium">
                  {currency === 'INR' ? '₹' : '$'}{parseFloat(price).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-indigo-400">GST (18%):</span>
                <span className="text-white font-medium">
                  {currency === 'INR' ? '₹' : '$'}{gstAmount.toFixed(2)}
                </span>
              </div>
              <div className="h-px bg-indigo-800 my-2"></div>
              <div className="flex justify-between">
                <span className="font-semibold text-white">Total Amount:</span>
                <span className="font-bold text-indigo-400 text-lg">
                  {currency === 'INR' ? '₹' : '$'}{totalWithGst.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {customPrice !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={mutation.isPending}
                className="border-indigo-700 text-indigo-300 hover:bg-indigo-900/40"
              >
                Reset to Plan Price
              </Button>
            )}
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Custom Price
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
