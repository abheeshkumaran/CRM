import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';

interface CreateOrgFormData {
  name: string;
  slug: string;
  contactEmail: string;
  firstName: string;
  lastName: string;
  planId: string;
  password?: string;
}

export function CreateOrganisationDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateOrgFormData>();

  // Register planId manually with validation
  useState(() => {
    register('planId', { required: 'Plan is required' });
  });

  // Fetch Plans
  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/super-admin/plans');
      return res.data.plans;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const createOrgMutation = useMutation({
    mutationFn: async (data: CreateOrgFormData) => {
      const res = await api.post('/super-admin/organisations', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Organisation created successfully');
      setOpen(false);
      reset();
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || 'Failed to create organisation');
    }
  });

  const onSubmit = (data: CreateOrgFormData) => {
    createOrgMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Organisation
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Create New Organisation</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new organisation to the platform. This will also create an initial admin user.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Org Name</Label>
              <Input
                id="name"
                {...register('name', { required: 'Name is required' })}
                className="bg-background border-input"
                placeholder="Acme Corp"
              />
              {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug" className="text-foreground">Slug (URL)</Label>
              <Input
                id="slug"
                {...register('slug', { required: 'Slug is required' })}
                className="bg-background border-input"
                placeholder="acme-corp"
              />
              {errors.slug && <span className="text-xs text-destructive">{errors.slug.message}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail" className="text-foreground">Contact Email</Label>
            <Input
              id="contactEmail"
              type="email"
              {...register('contactEmail', { required: 'Email is required' })}
              className="bg-background border-input"
              placeholder="admin@acme.com"
            />
            {errors.contactEmail && <span className="text-xs text-destructive">{errors.contactEmail.message}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-foreground">Admin First Name</Label>
              <Input
                id="firstName"
                {...register('firstName', { required: 'First name is required' })}
                className="bg-background border-input"
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-foreground">Admin Last Name</Label>
              <Input
                id="lastName"
                {...register('lastName', { required: 'Last name is required' })}
                className="bg-background border-input"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password (Optional)</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              className="bg-background border-input"
              placeholder="Defaults to 'Welcome123'"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="planId" className="text-foreground">Subscription Plan</Label>
            <Select
              onValueChange={(val: string) => setValue('planId', val, { shouldValidate: true })}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan: { id: string; name: string; price: number; currency: string }) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - {new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency }).format(plan.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && <span className="text-xs text-destructive">{errors.planId.message}</span>}
          </div>


          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-muted-foreground hover:bg-muted">
              Cancel
            </Button>
            <Button type="submit" disabled={createOrgMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {createOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organisation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
