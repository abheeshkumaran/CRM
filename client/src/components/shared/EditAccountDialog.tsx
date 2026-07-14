import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DynamicCustomFields from '@/components/forms/DynamicCustomFields';

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    name: string;
    industry?: string;
    type?: string;
    website?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      zipCode?: string; // Handle legacy prop name if needed, or stick to one
      country?: string;
    };
  };
  onSuccess: () => void;
}

export function EditAccountDialog({ open, onOpenChange, account, onSuccess }: EditAccountDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    industry: '',
    type: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        website: account.website || '',
        industry: account.industry || 'Other',
        type: account.type || 'Customer',
        address: {
          street: account.address?.street || '',
          city: account.address?.city || '',
          state: account.address?.state || '',
          zipCode: account.address?.zipCode || '',
          country: account.address?.country || ''
        }
      });
      // Load existing custom field values
      setCustomFieldValues((account as { customFields?: Record<string, unknown> }).customFields || {});
    }
  }, [account]);

  const handleChange = (field: string, value: string) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev] as Record<string, string>,
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      };
      await api.put(`/accounts/${account.id}`, payload);
      toast.success('Account updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomFieldChange = (name: string, value: unknown) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Make changes to account details here. Click save when you're done.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry} onValueChange={(val) => handleChange('industry', val)}>
                <SelectTrigger><SelectValue placeholder="Select Industry" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Retail">Retail</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={formData.type} onValueChange={(val) => handleChange('type', val)}>
                <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Prospect">Prospect</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="Partner">Partner</SelectItem>
                  <SelectItem value="Vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input placeholder="Street" value={formData.address.street} onChange={(e) => handleChange('address.street', e.target.value)} className="mb-2" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" value={formData.address.city} onChange={(e) => handleChange('address.city', e.target.value)} />
              <Input placeholder="State" value={formData.address.state} onChange={(e) => handleChange('address.state', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input placeholder="Zip Code" value={formData.address.zipCode} onChange={(e) => handleChange('address.zipCode', e.target.value)} />
              <Input placeholder="Country" value={formData.address.country} onChange={(e) => handleChange('address.country', e.target.value)} />
            </div>
          </div>

          {/* Custom Fields */}
          <DynamicCustomFields
            entityType="Account"
            values={customFieldValues}
            onChange={handleCustomFieldChange}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
