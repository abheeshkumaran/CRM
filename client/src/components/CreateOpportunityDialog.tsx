import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { isAxiosError } from 'axios';
import DynamicCustomFields from '@/components/forms/DynamicCustomFields';
import { CloseWonDialog } from './CloseWonDialog';

interface CreateOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    accountId?: string;
    contactId?: string;
  };
  onSuccess?: () => void;
}

interface UpsellConfig {
  itemLabel?: string;
  quantityLabel?: string;
  priceLabel?: string;
}

export function CreateOpportunityDialog({ open, onOpenChange, defaultValues, onSuccess }: CreateOpportunityDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [showCloseWonDialog, setShowCloseWonDialog] = useState(false);
  const [createdOpp, setCreatedOpp] = useState<any>(null);
  const queryClient = useQueryClient();

  // Form States
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [stage, setStage] = useState('prospecting');
  const [probability, setProbability] = useState<number>(10);
  const [closeDate, setCloseDate] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState(defaultValues?.accountId || '');

  // Calculator States
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcItem, setCalcItem] = useState('');
  const [calcQuantity, setCalcQuantity] = useState<number>(0);
  const [calcPrice, setCalcPrice] = useState<number>(0);

  const [type, setType] = useState('NEW_BUSINESS');

  // Fetch Organisation Settings for Custom Labels
  const { data: org } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => (await api.get('/organisation')).data,
    staleTime: 1000 * 60 * 5 // 5 mins
  });

  const labels = useMemo(() => {
    const config = org?.upsellConfig as UpsellConfig | undefined;
    return {
      itemLabel: config?.itemLabel || 'Item',
      quantityLabel: config?.quantityLabel || 'Quantity',
      priceLabel: config?.priceLabel || 'Price'
    };
  }, [org]);

  // Auto-calculate amount and description
  useEffect(() => {
    if (showCalculator) {
      const total = calcQuantity * calcPrice;
      setAmount(total);
      setProbability(100); // Usually closed/won if doing payment
      setStage('closed_won');

      if (calcQuantity > 0 && calcPrice > 0) {
        setDescription(`Upsell: ${calcQuantity} ${labels.quantityLabel} of ${calcItem || labels.itemLabel} @ ${calcPrice} / ${labels.quantityLabel}`);
        if (!name) setName(`${calcItem || labels.itemLabel} Payment`);
      }
    }
  }, [calcQuantity, calcPrice, calcItem, showCalculator, labels, name]);

  // Reset form on open
  useEffect(() => {
    if (open) {
      setName('');
      setAmount(0);
      setStage('prospecting');
      setProbability(10);
      setCloseDate('');
      setDescription('');
      setAccountId(defaultValues?.accountId || '');
      setShowCalculator(false);
      setCalcItem('');
      setCalcQuantity(0);
      setCalcPrice(0);
      setCustomFieldValues({});

      // Pre-set 'Closed Won' if creating from a context that implies payment? 
      // Maybe not, let user choose.
    }
  }, [open, defaultValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await api.post('/opportunities', {
        name,
        amount,
        stage,
        probability,
        closeDate: closeDate || new Date().toISOString(),
        description,
        accountId: accountId || undefined,
        type,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      });

      const newOpp = res.data;

      if (stage === 'closed_won') {
        setCreatedOpp(newOpp);
        setShowCloseWonDialog(true);
      } else {
        toast.success('Opportunity created successfully');
        queryClient.invalidateQueries({ queryKey: ['opportunities'] });
        if (accountId) queryClient.invalidateQueries({ queryKey: ['account', accountId] });
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (error: unknown) {
      console.error(error);
      let message = 'Failed to create opportunity';
      if (isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomFieldChange = (name: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Opportunity</DialogTitle>
          <DialogDescription>Add a new deal or record a payment.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Calculator Toggle */}
          <div className="flex items-center space-x-2 bg-muted/50 p-3 rounded-lg border">
            <Switch id="calculator-mode" checked={showCalculator} onCheckedChange={setShowCalculator} />
            <Label htmlFor="calculator-mode" className="flex items-center gap-2 cursor-pointer font-medium">
              <Calculator className="h-4 w-4" />
              Revenue Calculator (Payment Mode)
            </Label>
          </div>

          {showCalculator && (
            <div className="grid gap-4 p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
              <div className="grid gap-2">
                <Label>{labels.itemLabel}</Label>
                <Input
                  value={calcItem}
                  onChange={(e) => setCalcItem(e.target.value)}
                  placeholder={`e.g. ${labels.itemLabel}`}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{labels.quantityLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={calcQuantity}
                    onChange={(e) => setCalcQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{labels.priceLabel}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="text-right font-bold text-lg text-blue-700">
                Total: ${calcQuantity * calcPrice}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deal Name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                readOnly={showCalculator}
                className={showCalculator ? 'bg-muted' : ''}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="stage">Stage</Label>
              <Select 
                value={['prospecting', 'qualification', 'proposal', 'negotiation'].includes(stage) ? 'prospecting' : stage} 
                onValueChange={setStage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecting">Expected</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Opportunity Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                <SelectItem value="UPSALE">Upsale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="closeDate">Close Date</Label>
              <Input
                id="closeDate"
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                min="0" max="100"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
            />
          </div>

          {/* Custom Fields */}
          <DynamicCustomFields
            entityType="Opportunity"
            values={customFieldValues}
            onChange={handleCustomFieldChange}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Opportunity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {createdOpp && showCloseWonDialog && (
        <CloseWonDialog
          open={showCloseWonDialog}
          onOpenChange={(open) => {
            setShowCloseWonDialog(open);
            if (!open) {
              // When closing EMI dialog, finalize everything
              queryClient.invalidateQueries({ queryKey: ['opportunities'] });
              if (accountId) queryClient.invalidateQueries({ queryKey: ['account', accountId] });
              onSuccess?.();
              onOpenChange(false);
            }
          }}
          opportunityId={createdOpp.id}
          opportunityName={createdOpp.name}
          amount={createdOpp.amount}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['opportunities'] });
            if (accountId) queryClient.invalidateQueries({ queryKey: ['account', accountId] });
            onSuccess?.();
            onOpenChange(false);
          }}
        />
      )}
    </Dialog>
  );
}
