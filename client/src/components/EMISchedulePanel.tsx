import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, CheckCircle2, Clock, AlertCircle, XCircle, Plus, CreditCard, Trash2, CalendarDays } from "lucide-react"
import { useCurrency } from "@/contexts/CurrencyContext"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getEMISchedule,
  convertToEMI,
  markInstallmentPaid,
  deleteInstallment,
  type EMISchedule,
  type EMIInstallment,
} from "@/services/emiService"

interface EMISchedulePanelProps {
  opportunityId: string
  paymentStatus?: string
  opportunityAmount?: number
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending" },
  paid: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", label: "Paid" },
  overdue: { icon: <AlertCircle className="w-3.5 h-3.5" />, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", label: "Overdue" },
  cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", label: "Cancelled" },
}

export function EMISchedulePanel({ opportunityId, paymentStatus, opportunityAmount }: EMISchedulePanelProps) {
  const { formatCurrency } = useCurrency()
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [installmentRows, setInstallmentRows] = useState<Array<{ dueDate: string; amount: string }>>([
    { dueDate: "", amount: "" }
  ])
  const queryClient = useQueryClient()

  const { data: emiSchedule, isLoading } = useQuery({
    queryKey: ['emi-schedule', opportunityId],
    queryFn: () => getEMISchedule(opportunityId),
    enabled: !!opportunityId,
  })

  const convertMutation = useMutation({
    mutationFn: () => convertToEMI(opportunityId, {
      installments: installmentRows
        .filter(r => r.dueDate && r.amount)
        .map(r => ({ dueDate: r.dueDate, amount: parseFloat(r.amount) }))
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emi-schedule', opportunityId] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['emi-schedules'] })
      toast.success("EMI schedule created successfully")
      setShowConvertDialog(false)
      setInstallmentRows([{ dueDate: "", amount: "" }])
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: string } } }
      toast.error(err.response?.data?.error || "Failed to create EMI schedule")
    }
  })

  const payMutation = useMutation({
    mutationFn: (installmentId: string) => markInstallmentPaid(installmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emi-schedule', opportunityId] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success("Installment marked as paid")
    },
    onError: () => {
      toast.error("Failed to mark installment as paid")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (installmentId: string) => deleteInstallment(installmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emi-schedule', opportunityId] })
      toast.success("Installment deleted")
    },
    onError: () => {
      toast.error("Failed to delete installment")
    }
  })

  const addInstallmentRow = () => {
    setInstallmentRows(prev => [...prev, { dueDate: "", amount: "" }])
  }

  const removeInstallmentRow = (index: number) => {
    setInstallmentRows(prev => prev.filter((_, i) => i !== index))
  }

  const updateInstallmentRow = (index: number, field: 'dueDate' | 'amount', value: string) => {
    setInstallmentRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const autoSplitAmount = () => {
    if (!opportunityAmount || installmentRows.length === 0) return
    const perInstallment = (opportunityAmount / installmentRows.length).toFixed(2)
    setInstallmentRows(prev => prev.map(row => ({ ...row, amount: perInstallment })))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading EMI schedule...</span>
      </div>
    )
  }

  // No EMI schedule exists
  if (!emiSchedule) {
    if (!opportunityAmount || opportunityAmount <= 0) return null

    return (
      <Card className="border-dashed border-2 border-blue-200 dark:border-blue-800">
        <CardContent className="py-6 text-center">
          <CreditCard className="w-8 h-8 mx-auto mb-3 text-blue-500 opacity-60" />
          <p className="text-sm text-muted-foreground mb-3">
            This opportunity has a partial payment. Convert the remaining amount to EMI installments.
          </p>
          <Button onClick={() => setShowConvertDialog(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Convert to EMI
          </Button>

          <ConvertDialog
            open={showConvertDialog}
            onOpenChange={setShowConvertDialog}
            installmentRows={installmentRows}
            onAddRow={addInstallmentRow}
            onRemoveRow={removeInstallmentRow}
            onUpdateRow={updateInstallmentRow}
            onAutoSplit={autoSplitAmount}
            onSubmit={() => convertMutation.mutate()}
            isPending={convertMutation.isPending}
            opportunityAmount={opportunityAmount}
            formatCurrency={formatCurrency}
          />
        </CardContent>
      </Card>
    )
  }

  // EMI schedule exists — show it
  const progressPercent = emiSchedule.totalAmount > 0
    ? Math.round((emiSchedule.paidAmount / emiSchedule.totalAmount) * 100)
    : 0

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            EMI Schedule
          </CardTitle>
          <Badge
            variant="outline"
            className={emiSchedule.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}
          >
            {emiSchedule.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-semibold text-sm">{formatCurrency(emiSchedule.totalAmount)}</div>
          </div>
          <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="font-semibold text-sm text-green-600">{formatCurrency(emiSchedule.paidAmount)}</div>
          </div>
          <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-semibold text-sm text-orange-600">{formatCurrency(emiSchedule.remainingAmount)}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Payment Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Installments List */}
        <div className="space-y-2">
          <h5 className="text-sm font-medium flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Installments ({emiSchedule.installments.length})
          </h5>
          {emiSchedule.installments
            .sort((a: EMIInstallment, b: EMIInstallment) => a.installmentNumber - b.installmentNumber)
            .map((installment: EMIInstallment) => {
              const config = statusConfig[installment.status] || statusConfig.pending
              return (
                <div key={installment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        #{installment.installmentNumber} — {formatCurrency(installment.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Due: {new Date(installment.dueDate).toLocaleDateString()}
                        {installment.paidDate && (
                          <> · Paid: {new Date(installment.paidDate).toLocaleDateString()}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                      {config.icon}
                      {config.label}
                    </span>
                    {installment.status === 'pending' || installment.status === 'overdue' ? (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => payMutation.mutate(installment.id)}
                          disabled={payMutation.isPending}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Pay
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(installment.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
}

// Convert to EMI Dialog
interface ConvertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  installmentRows: Array<{ dueDate: string; amount: string }>
  onAddRow: () => void
  onRemoveRow: (index: number) => void
  onUpdateRow: (index: number, field: 'dueDate' | 'amount', value: string) => void
  onAutoSplit: () => void
  onSubmit: () => void
  isPending: boolean
  opportunityAmount?: number
  formatCurrency: (amount: number) => string
}

function ConvertDialog({
  open, onOpenChange, installmentRows, onAddRow, onRemoveRow,
  onUpdateRow, onAutoSplit, onSubmit, isPending, opportunityAmount, formatCurrency
}: ConvertDialogProps) {
  const totalEMI = installmentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)
  const isValid = installmentRows.length > 0 && installmentRows.every(r => r.dueDate && r.amount && parseFloat(r.amount) > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Convert to EMI</DialogTitle>
          <DialogDescription>
            Set up installment schedule for the remaining balance.
            {opportunityAmount && (
              <span className="block mt-1 font-medium text-foreground">
                Opportunity Amount: {formatCurrency(opportunityAmount)}
              </span>
            )}
            <span className="block mt-1 text-xs text-muted-foreground">
              Note: The total of all installments must equal the remaining amount after partial payments.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {installmentRows.map((row, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Due Date</Label>
                <Input
                  type="date"
                  value={row.dueDate}
                  onChange={(e) => onUpdateRow(index, 'dueDate', e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs">Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.amount}
                  onChange={(e) => onUpdateRow(index, 'amount', e.target.value)}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
              {installmentRows.length > 1 && (
                <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => onRemoveRow(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onAddRow} className="gap-1">
              <Plus className="w-3 h-3" /> Add Installment
            </Button>
            {opportunityAmount && installmentRows.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={onAutoSplit} className="text-xs">
                Auto-split equally
              </Button>
            )}
          </div>
          <span className="text-sm font-medium">
            Total: {formatCurrency(totalEMI)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create EMI Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
