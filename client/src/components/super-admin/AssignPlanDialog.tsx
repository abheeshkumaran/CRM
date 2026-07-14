import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

interface AssignPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organisationId: string;
  currentPlanId?: string;
  organisationName: string;
}

interface AssignPlanFormData {
  planId: string;
}

export function AssignPlanDialog({
  open,
  onOpenChange,
  organisationId,
  currentPlanId,
  organisationName
}: AssignPlanDialogProps) {
  const queryClient = useQueryClient();
  const { handleSubmit, setValue, formState: { errors } } = useForm<AssignPlanFormData>({
    defaultValues: {
      planId: currentPlanId || ''
    }
  });

  // Fetch Plans
  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const res = await api.get('/super-admin/plans');
      return res.data.plans;
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (data: AssignPlanFormData) => {
      console.log('[AssignPlanDialog] Mutation started with data:', data);
      const res = await api.put(`/super-admin/organisations/${organisationId}`, {
        planId: data.planId
      });
      console.log('[AssignPlanDialog] API Response:', res.data);
      return res.data;
    },
    onSuccess: () => {
      console.log('[AssignPlanDialog] Mutation successful');
      queryClient.invalidateQueries({ queryKey: ['organisation', organisationId] });
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      toast.success('Subscription plan updated successfully');
      onOpenChange(false);
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      console.error('[AssignPlanDialog] Mutation failed:', error);
      console.error('[AssignPlanDialog] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update subscription plan');
    }
  });

  const onSubmit = (data: AssignPlanFormData) => {
    updatePlanMutation.mutate(data);
  };

  const selectedPlanId = useForm<AssignPlanFormData>().watch('planId') || currentPlanId;
  const selectedPlan = plans?.find((p: any) => p.id === selectedPlanId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border text-foreground">
        <DialogHeader>
          <DialogTitle>Update Subscription Plan</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Change the subscription plan for <span className="font-semibold text-foreground">{organisationName}</span>.
            This will immediately update limits and billing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="planId" className="text-foreground">Select New Plan</Label>
            <Select
              defaultValue={currentPlanId}
              onValueChange={(val: string) => setValue('planId', val, { shouldValidate: true })}
            >
              <SelectTrigger className="bg-background border-input">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingPlans ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">Loading plans...</div>
                ) : (
                  plans?.map((plan: { id: string; name: string; price: number; currency: string; durationDays: number }) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{plan.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: plan.currency }).format(plan.price)} / {plan.durationDays} days
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.planId && <span className="text-xs text-destructive">{errors.planId.message}</span>}
          </div>

          {selectedPlan && (
            <div className="rounded-md border border-indigo-500/20 bg-indigo-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-medium">
                <Check className="h-4 w-4" />
                <span>Plan Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Price:</div>
                <div className="text-foreground font-medium">
                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: selectedPlan.currency }).format(selectedPlan.price)}
                </div>
                <div className="text-muted-foreground">Duration:</div>
                <div className="text-foreground font-medium">{selectedPlan.durationDays} Days</div>
                <div className="text-muted-foreground">Max Users:</div>
                <div className="text-foreground font-medium">{selectedPlan.maxUsers}</div>
                <div className="text-muted-foreground">Max Leads:</div>
                <div className="text-foreground font-medium">{selectedPlan.maxLeads}</div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">
              Cancel
            </Button>
            <Button type="submit" disabled={updatePlanMutation.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {updatePlanMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
