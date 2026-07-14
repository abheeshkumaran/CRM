import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, CreditCard, ChevronRight, Plus, Trash2, CheckCircle2 } from "lucide-react"
import { useCurrency } from "@/contexts/CurrencyContext"
import { api } from "@/services/api"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface QuickConvertWonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: {
    id: string
    firstName: string
    lastName: string
    company: string
    potentialValue?: number
    products?: Array<{
      productId: string
      quantity: number
      price: number
      product?: {
        name: string
      }
    }>
  }
}

type PaymentOption = 'paid' | 'partial' | 'emi'

export function QuickConvertWonDialog({
  open,
  onOpenChange,
  lead
}: QuickConvertWonDialogProps) {
  const { formatCurrency } = useCurrency()
  const [paymentType, setPaymentType] = useState<PaymentOption>('paid')
  const [paidAmount, setPaidAmount] = useState<string>("0")
  const [installmentRows, setInstallmentRows] = useState<Array<{ dueDate: string; amount: string }>>([])
  
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Calculate amount
  const calculateAmount = () => {
    if (lead.potentialValue) return lead.potentialValue;
    if (!lead.products || lead.products.length === 0) return 0;
    return lead.products.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const amount = calculateAmount();

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        stage: 'closed_won',
        paymentType,
        dealName: `${lead.company || lead.firstName} - Won Deal`,
        amount: amount,
        accountName: lead.company || `${lead.firstName} ${lead.lastName || ''}`.trim(),
        contactName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      }

      if (paymentType === 'partial') {
        payload.paidAmount = parseFloat(paidAmount) || 0
        payload.installments = installmentRows
          .filter(r => r.dueDate && r.amount)
          .map(r => ({ dueDate: r.dueDate, amount: parseFloat(r.amount) }))
      } else if (paymentType === 'emi') {
        payload.installments = installmentRows
          .filter(r => r.dueDate && r.amount)
          .map(r => ({ dueDate: r.dueDate, amount: parseFloat(r.amount) }))
      }

      const res = await api.post(`/leads/${lead.id}/convert`, payload)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["opportunities"] })
      toast.success("Lead converted and deal closed won! 🎉")
      onOpenChange(false)
      
      // Redirect to opportunities
      navigate('/opportunities');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to convert lead")
    }
  })

  const handleAddInstallment = () => {
    setInstallmentRows(prev => [...prev, { dueDate: "", amount: "" }])
  }

  const handleRemoveInstallment = (index: number) => {
    setInstallmentRows(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpdateInstallment = (index: number, field: 'dueDate' | 'amount', value: string) => {
    setInstallmentRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const remainingAmount = amount - (parseFloat(paidAmount) || 0)
  const emiTotal = installmentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

  const isEmiValid = paymentType === 'paid' ||
    (paymentType === 'partial' && (Math.abs(remainingAmount - emiTotal) < 0.1 || (installmentRows.length === 0 && remainingAmount === 0))) ||
    (paymentType === 'emi' && Math.abs(amount - emiTotal) < 0.1)

  const canSubmit = !mutation.isPending && isEmiValid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Quick Close Won
          </DialogTitle>
          <DialogDescription>
            Convert {lead.firstName} to a won deal of {formatCurrency(amount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <RadioGroup
            defaultValue="paid"
            onValueChange={(v: string) => {
              setPaymentType(v as PaymentOption)
              if (v === 'emi') setPaidAmount("0")
              setInstallmentRows([])
            }}
            className="grid grid-cols-1 gap-4"
          >
            <Label
              htmlFor="full-paid"
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="paid" id="full-paid" />
                <div>
                  <div className="font-semibold">Fully Paid</div>
                  <div className="text-xs text-muted-foreground text-pretty">The client has paid the full amount upfront.</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Label>

            <Label
              htmlFor="partial-paid"
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="partial" id="partial-paid" />
                <div>
                  <div className="font-semibold">Partially Paid</div>
                  <div className="text-xs text-muted-foreground text-pretty">Down payment received, balance can be converted to EMI.</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Label>

            <Label
              htmlFor="full-emi"
              className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary"
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="emi" id="full-emi" />
                <div>
                  <div className="font-semibold">Full EMI</div>
                  <div className="text-xs text-muted-foreground text-pretty">No upfront payment, total amount converted to installments.</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Label>
          </RadioGroup>

          {paymentType === 'partial' && (
            <div className="space-y-2 pt-2 border-t">
              <Label>Down Payment Received (₹)</Label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                max={amount}
              />
              <p className="text-xs text-muted-foreground">
                Balance to be covered: {formatCurrency(remainingAmount)}
              </p>
            </div>
          )}

          {(paymentType === 'partial' || paymentType === 'emi') && (
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  EMI Installments
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInstallment}
                  className="h-7 gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>

              <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                {installmentRows.map((row, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase">Due Date</Label>
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => handleUpdateInstallment(index, 'dueDate', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] uppercase">Amount (₹)</Label>
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) => handleUpdateInstallment(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleRemoveInstallment(index)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              {(paymentType === 'partial' || paymentType === 'emi') && installmentRows.length > 0 && (
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-muted-foreground">Total EMI: {formatCurrency(emiTotal)}</span>
                  {Math.abs((paymentType === 'partial' ? remainingAmount : amount) - emiTotal) > 0.1 && (
                    <span className="text-destructive text-xs font-medium">
                      Must equal {formatCurrency(paymentType === 'partial' ? remainingAmount : amount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            className="bg-success hover:bg-success/90"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Convert & Close Won
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
