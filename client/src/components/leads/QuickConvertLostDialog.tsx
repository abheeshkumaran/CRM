import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface QuickConvertLostDialogProps {
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

export function QuickConvertLostDialog({
  open,
  onOpenChange,
  lead
}: QuickConvertLostDialogProps) {
  const [remarks, setRemarks] = useState("")
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        stage: 'closed_lost',
        lostReason: remarks,
        dealName: `${lead.company || lead.firstName} - Lost Deal`,
        accountName: lead.company || `${lead.firstName} ${lead.lastName || ''}`.trim(),
        contactName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
      }

      const res = await api.post(`/leads/${lead.id}/convert`, payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      queryClient.invalidateQueries({ queryKey: ["opportunities"] })
      toast.success("Lead converted and marked as closed lost.")
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to convert lead")
    }
  })

  const canSubmit = !mutation.isPending && remarks.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Quick Close Lost
          </DialogTitle>
          <DialogDescription>
            Convert {lead.firstName} and mark as lost. Remarks are mandatory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks (Mandatory)</Label>
            <Textarea
              id="remarks"
              placeholder="Enter reason for loss..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Close Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
