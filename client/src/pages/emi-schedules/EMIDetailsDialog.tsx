import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/services/api"
import { type EMISchedule } from "./columns"
import { CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react"
import { EMISchedulePanel } from "@/components/EMISchedulePanel"

interface EMIDetailsDialogProps {
  schedule: EMISchedule
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EMIDetailsDialog({ schedule, open, onOpenChange }: EMIDetailsDialogProps) {
  const queryClient = useQueryClient()
  const [selectedInstallment, setSelectedInstallment] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")

  const markPaidMutation = useMutation({
    mutationFn: async ({ installmentId, amount }: { installmentId: string, amount: number }) => {
      const response = await api.post(`/emi-schedules/${schedule.id}/installments/${installmentId}/pay`, {
        amount
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emi-schedules'] })
      toast.success('Payment recorded successfully')
      setSelectedInstallment(null)
      setPaymentAmount("")
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record payment')
    }
  })

  const markMissedMutation = useMutation({
    mutationFn: async (installmentId: string) => {
      const response = await api.post(`/emi-schedules/${schedule.id}/installments/${installmentId}/miss`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emi-schedules'] })
      toast.success('Installment marked as missed. Amount carried forward to next installment.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark as missed')
    }
  })

  const handlePayment = (installmentId: string, dueAmount: number) => {
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (amount > dueAmount) {
      toast.error('Payment amount cannot exceed due amount')
      return
    }
    markPaidMutation.mutate({ installmentId, amount })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'overdue':
      case 'missed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <Calendar className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    let variant: "default" | "secondary" | "destructive" | "outline" = "outline"
    switch (status) {
      case 'paid': variant = "default"; break;
      case 'overdue': variant = "destructive"; break;
      case 'missed': variant = "destructive"; break;
      case 'pending': variant = "secondary"; break;
    }
    return <Badge variant={variant} className="capitalize">{status}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>EMI Schedule Details</DialogTitle>
          <DialogDescription className="sr-only">Detailed view of installment payments and status.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">₹{schedule.totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid Amount</p>
              <p className="text-2xl font-bold text-green-600">₹{schedule.paidAmount.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold text-orange-600">₹{schedule.remainingAmount.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Installments */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Installments</h3>
            <div className="space-y-3">
                {schedule.installments.map((installment) => (
                  <div
                    key={installment.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(installment.status)}
                        <div className="flex-1 flex flex-col">
                          <div className="font-semibold text-base mb-1">Installment #{installment.installmentNumber}</div>
                          <div className="mb-2">{getStatusBadge(installment.status)}</div>
                          <div className="text-sm text-muted-foreground mb-1">Due Date: {format(new Date(installment.dueDate), "MMM d, yyyy")}</div>
                          <div className="text-sm font-medium mb-1">Amount: ₹{installment.amount.toLocaleString('en-IN')}</div>
                          {installment.paidAmount > 0 && (
                            <>
                              <div className="text-sm text-green-600 mb-1">Paid: ₹{installment.paidAmount.toLocaleString('en-IN')}</div>
                              {installment.paidDate && (
                                <div className="text-sm text-muted-foreground">Paid on: {format(new Date(installment.paidDate), "MMM d, yyyy")}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {installment.status !== 'paid' && (
                        <div className="flex gap-2">
                          {selectedInstallment === installment.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                type="number"
                                placeholder="Amount"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                onClick={() => handlePayment(installment.id, installment.amount - installment.paidAmount)}
                                disabled={markPaidMutation.isPending}
                              >
                                {markPaidMutation.isPending ? 'Saving...' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInstallment(null)
                                  setPaymentAmount("")
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInstallment(installment.id)
                                  setPaymentAmount((installment.amount - installment.paidAmount).toString())
                                }}
                              >
                                Record Payment
                              </Button>
                              {installment.status === 'overdue' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => markMissedMutation.mutate(installment.id)}
                                  disabled={markMissedMutation.isPending}
                                >
                                  Mark Missed
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          </div>

          {/* Info */}
          <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">Note:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Mark an installment as "Missed" to carry forward the amount to the next installment</li>
              <li>Partial payments are supported - enter the amount being paid</li>
              <li>Overdue installments are automatically marked when the due date passes</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
