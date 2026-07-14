import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { CloseWonDialog } from "./CloseWonDialog"
import { CloseLostDialog } from "./CloseLostDialog"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/services/api"
import DynamicCustomFields from "@/components/forms/DynamicCustomFields";

import { type Opportunity } from "@/services/opportunityService"

interface EditOpportunityDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  opportunity: Opportunity
}

interface EditOpportunityFormData {
  name: string
  amount: number
  stage: string
  probability: number
  closeDate: string
  type: 'NEW_BUSINESS' | 'UPSALE'
}

export function EditOpportunityDialog({ children, open, onOpenChange, opportunity }: EditOpportunityDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  // Initialize custom fields from opportunity
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>(() =>
    (opportunity as any).customFields || {}
  )
  const [prevOpportunityId, setPrevOpportunityId] = useState(opportunity.id);
  const [showCloseWonDialog, setShowCloseWonDialog] = useState(false)
  const [showCloseLostDialog, setShowCloseLostDialog] = useState(false)
  const [pendingData, setPendingData] = useState<EditOpportunityFormData | null>(null)

  if (opportunity.id !== prevOpportunityId) {
    setPrevOpportunityId(opportunity.id);
    setCustomFieldValues((opportunity as any).customFields || {});
  }
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  // Debug logging
  console.log('EditOpportunityDialog render:', { open, finalOpen, isControlled, opportunityId: opportunity.id });

  const queryClient = useQueryClient()

  const form = useForm<EditOpportunityFormData>({
    defaultValues: {
      name: opportunity.name || "",
      amount: opportunity.amount || 0,
      stage: opportunity.stage || "prospecting",
      probability: opportunity.probability || 10,
      closeDate: opportunity.closeDate ? new Date(opportunity.closeDate).toISOString().split('T')[0] : "",
      type: opportunity.type || 'NEW_BUSINESS',
    },
  })

  useEffect(() => {
    if (opportunity) {
      form.reset({
        name: opportunity.name || "",
        amount: opportunity.amount || 0,
        stage: opportunity.stage || "prospecting",
        probability: opportunity.probability || 10,
        closeDate: opportunity.closeDate ? new Date(opportunity.closeDate).toISOString().split('T')[0] : "",
        type: opportunity.type || 'NEW_BUSINESS',
      })
    }
  }, [opportunity, form])

  const mutation = useMutation({
    mutationFn: async (data: EditOpportunityFormData) => {
      const payload = {
        ...data,
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      };
      const res = await api.put(`/opportunities/${opportunity.id}`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] })
      toast.success("Opportunity updated successfully")
      finalOnOpenChange?.(false)
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to update opportunity")
    },
  })

  function onSubmit(values: EditOpportunityFormData) {
    if (values.stage === 'closed_won' && opportunity.stage !== 'closed_won') {
      setPendingData(values);
      setShowCloseWonDialog(true);
      return;
    }
    if (values.stage === 'closed_lost' && opportunity.stage !== 'closed_lost') {
      setPendingData(values);
      setShowCloseLostDialog(true);
      return;
    }
    mutation.mutate(values)
  }

  const handleCustomFieldChange = (name: string, value: any) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Opportunity</DialogTitle>
          <DialogDescription>
            Update deal details, amount, and stage.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Big Deal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                rules={{ required: "Amount is required", min: 0 }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="probability"
                rules={{ required: "Probability is required", min: 0, max: 100 }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stage</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={['prospecting', 'qualification', 'proposal', 'negotiation'].includes(field.value) ? 'prospecting' : field.value}
                    disabled={opportunity.stage === 'closed_won' || opportunity.stage === 'closed_lost'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="prospecting">Expected</SelectItem>
                      <SelectItem value="closed_won">Closed Won</SelectItem>
                      <SelectItem value="closed_lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="closeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Close Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opportunity Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NEW_BUSINESS">New Business</SelectItem>
                      <SelectItem value="UPSALE">Upsale</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Fields */}
            <DynamicCustomFields
              entityType="Opportunity"
              values={customFieldValues}
              onChange={handleCustomFieldChange}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {showCloseWonDialog && (
        <CloseWonDialog
          open={showCloseWonDialog}
          onOpenChange={setShowCloseWonDialog}
          opportunityId={opportunity.id}
          opportunityName={opportunity.name}
          amount={pendingData?.amount || opportunity.amount}
          onSuccess={() => {
            finalOnOpenChange?.(false)
          }}
        />
      )}

      {showCloseLostDialog && (
        <CloseLostDialog
          open={showCloseLostDialog}
          onOpenChange={setShowCloseLostDialog}
          opportunityId={opportunity.id}
          opportunityName={opportunity.name}
          onSuccess={() => {
            finalOnOpenChange?.(false)
          }}
        />
      )}
    </Dialog>
  )
}
