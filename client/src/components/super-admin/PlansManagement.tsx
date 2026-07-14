import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  pricingModel: 'per_user' | 'flat_rate';
  pricePerUser?: number;
  durationDays: number;
  maxUsers: number;
  maxLeads: number;
  maxContacts: number;
  maxStorage: number;
  isActive: boolean;
  currency: string;
  discount?: number;
}

interface PlanFormData {
  name: string;
  description: string;
  price: number;
  pricingModel: 'per_user' | 'flat_rate';
  pricePerUser?: number;
  durationDays: number;
  maxUsers: number;
  maxLeads: number;
  maxContacts: number;
  maxStorage: number;
  discount?: number;
}

export function PlansManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/super-admin/plans');
      return res.data.plans;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: PlanFormData) => {
      await api.post('/super-admin/plans', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created successfully');
      setIsCreateOpen(false);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Failed to create plan')
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlanFormData> }) => {
      await api.put(`/super-admin/plans/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated successfully');
      setEditingPlan(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Failed to update plan')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/super-admin/plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deactivated successfully');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => toast.error(err.response?.data?.message || 'Failed to delete plan')
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-foreground">Subscription Plans</h2>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" /> Create Plan
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-muted/50">
              <TableHead className="text-muted-foreground">Name</TableHead>
              <TableHead className="text-muted-foreground">Price</TableHead>
              <TableHead className="text-muted-foreground">Duration</TableHead>
              <TableHead className="text-muted-foreground">Limits (Users/Leads/Storage)</TableHead>
              <TableHead className="text-muted-foreground">Discount</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : plans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No plans found</TableCell>
              </TableRow>
            ) : (
              plans?.map((plan: Plan) => (
                <TableRow key={plan.id} className="border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground">
                    {plan.name}
                    {plan.description && <div className="text-xs text-muted-foreground">{plan.description}</div>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {plan.pricingModel === 'per_user' ? (
                      <div>
                        <div>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency }).format(plan.pricePerUser || 0)}/user</div>
                        <div className="text-xs text-muted-foreground">Base: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency }).format(plan.price)}</div>
                      </div>
                    ) : (
                      new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency }).format(plan.price)
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{plan.durationDays} days</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    Users: {plan.maxUsers} <br />
                    Leads: {plan.maxLeads} <br />
                    Storage: {plan.maxStorage}MB
                  </TableCell>
                  <TableCell>
                    {plan.discount ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        {plan.discount}% Off
                      </Badge>
                    ) : (
                      <span className="text-slate-500 text-xs">No discount</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'} className={plan.isActive ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingPlan(plan)} className="cursor-pointer">
                          Edit
                        </DropdownMenuItem>
                        {plan.isActive && (
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(plan.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
                            Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PlanDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => createMutation.mutate(data as PlanFormData)}
        isLoading={createMutation.isPending}
        mode="create"
      />

      {editingPlan && (
        <PlanDialog
          open={!!editingPlan}
          onOpenChange={(open) => !open && setEditingPlan(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingPlan.id, data })}
          isLoading={updateMutation.isPending}
          initialData={editingPlan}
          mode="edit"
        />
      )}
    </div>
  );
}

function PlanDialog({ open, onOpenChange, onSubmit, isLoading, initialData, mode }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PlanFormData) => void;
  isLoading: boolean;
  initialData?: Plan;
  mode: 'create' | 'edit';
}) {
  const { register, handleSubmit, formState: { errors }, control, setValue } = useForm<PlanFormData>({
    defaultValues: initialData || {
      name: '',
      description: '',
      price: 0,
      pricingModel: 'flat_rate',
      pricePerUser: 0,
      durationDays: 30,
      maxUsers: 5,
      maxLeads: 1000,
      maxContacts: 5000,
      maxStorage: 1000,
      discount: 0
    }
  });

  const pricingModel = useWatch({ control, name: 'pricingModel' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Subscription Plan' : 'Edit Subscription Plan'}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define the limits and pricing for this plan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input {...register('name', { required: 'Name is required' })} className="bg-background border-input" />
              {errors.name && <span className="text-destructive text-xs">{errors.name.message}</span>}
            </div>
            <div className="space-y-2">
              <Label>Pricing Model</Label>
              <Select
                defaultValue={initialData?.pricingModel || 'flat_rate'}
                onValueChange={(value) => setValue('pricingModel', value as 'per_user' | 'flat_rate')}
              >
                <SelectTrigger className="bg-background border-input">
                  <SelectValue placeholder="Select pricing model" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="flat_rate">Flat Rate</SelectItem>
                  <SelectItem value="per_user">Per User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{pricingModel === 'per_user' ? 'Base Price (INR)' : 'Price (INR)'}</Label>
              <Input type="number" {...register('price', { valueAsNumber: true })} className="bg-background border-input" />
              {pricingModel === 'per_user' && (
                <span className="text-xs text-muted-foreground">Base price charged regardless of users</span>
              )}
            </div>
            {pricingModel === 'per_user' && (
              <div className="space-y-2">
                <Label>Price Per User (INR)</Label>
                <Input type="number" {...register('pricePerUser', { valueAsNumber: true })} className="bg-background border-input" />
                <span className="text-xs text-muted-foreground">Additional cost per user</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input {...register('description')} className="bg-background border-input" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input type="number" {...register('durationDays', { valueAsNumber: true })} className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input type="number" {...register('maxUsers', { valueAsNumber: true })} className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Max Leads</Label>
              <Input type="number" {...register('maxLeads', { valueAsNumber: true })} className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input type="number" {...register('discount', { valueAsNumber: true })} placeholder="0" className="bg-background border-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Max Contacts</Label>
              <Input type="number" {...register('maxContacts', { valueAsNumber: true })} className="bg-background border-input" />
            </div>
            <div className="space-y-2">
              <Label>Max Storage (MB)</Label>
              <Input type="number" {...register('maxStorage', { valueAsNumber: true })} className="bg-background border-input" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Plan' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
