import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DynamicCustomFields from '@/components/forms/DynamicCustomFields';

interface EditContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    phones?: { type: string; number: string }[];
    jobTitle?: string;
    department?: string;
  };
  onSuccess: () => void;
}

export function EditContactDialog({ open, onOpenChange, contact, onSuccess }: EditContactDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    phones: [] as { type: string; number: string }[]
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        jobTitle: contact.jobTitle || '',
        phones: Array.isArray(contact.phones) ? contact.phones : (contact.phones ? [{ type: 'mobile', number: (contact.phones as any).mobile || '' }] : [{ type: 'mobile', number: '' }])
      });
      // Load existing custom field values if any
      setCustomFieldValues((contact as { customFields?: Record<string, unknown> }).customFields || {});
    }
  }, [contact]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhoneChange = (index: number, field: 'type' | 'number', value: string) => {
    const newPhones = [...formData.phones];
    newPhones[index] = { ...newPhones[index], [field]: value };
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const validatePhone = (num: string): string | null => {
    num = num.trim();
    if (!num) return null; // Let the required validation (if any) handle empty
    
    if (num.startsWith('+91') && num.length !== 13) {
      return "Indian phone numbers (+91) must be exactly 10 digits.";
    }
    if (!num.startsWith('+') && num.length !== 10) {
      return "Phone number must be exactly 10 digits or include a valid country code (e.g. +1).";
    }
    if (num.startsWith('+') && (num.length < 5 || num.length > 16)) {
       return "Invalid international phone number length.";
    }
    return null;
  };

  const addPhone = () => {
    setFormData(prev => ({ ...prev, phones: [...prev.phones, { type: 'mobile', number: '' }] }));
  };

  const removePhone = (index: number) => {
    setFormData(prev => ({ ...prev, phones: prev.phones.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate phone numbers
    for (const phone of formData.phones) {
      const num = phone.number.trim();
      if (num) {
        if (num.startsWith('+91') && num.length !== 13) {
          toast.error("Indian phone numbers (+91) must be exactly 10 digits.");
          return;
        }
        if (!num.startsWith('+') && num.length !== 10) {
          toast.error("Phone number must be exactly 10 digits or include a valid country code (e.g. +1).");
          return;
        }
        if (num.startsWith('+') && (num.length < 5 || num.length > 16)) {
           toast.error("Invalid international phone number length.");
           return;
        }
      }
    }

    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      };
      await api.put(`/contacts/${contact.id}`, payload);
      toast.success('Contact updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error(error);
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update contact');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
          <DialogDescription>Update contact information and details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={formData.firstName} onChange={(e) => handleChange('firstName', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
              <Input id="lastName" value={formData.lastName} onChange={(e) => handleChange('lastName', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input id="jobTitle" value={formData.jobTitle} onChange={(e) => handleChange('jobTitle', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Phone Numbers</Label>
            {formData.phones.map((phone, index) => {
              const error = validatePhone(phone.number);
              return (
              <div key={index} className="flex flex-col mb-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Number"
                    value={phone.number}
                    onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => removePhone(index)}>
                    Remove
                  </Button>
                </div>
                {error && phone.number.trim().length > 0 && (
                  <span className="text-[10px] text-red-500 mt-1">{error}</span>
                )}
              </div>
            )})}
            <Button type="button" variant="outline" size="sm" onClick={addPhone} className="w-full">
              + Add Phone
            </Button>
          </div>

          {/* Custom Fields */}
          <DynamicCustomFields
            entityType="Contact"
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
