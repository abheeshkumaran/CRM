import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Loader2, XCircle } from "lucide-react"
import { api } from "@/services/api"

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

interface CloseLostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunityId: string
  opportunityName: string
  /** Called after the opportunity has been successfully saved */
  onSuccess?: () => void
}

export function CloseLostDialog({
  open,
  onOpenChange,
  opportunityId,
  opportunityName,
  onSuccess,
}: CloseLostDialogProps) {
  const [lostReason, setLostReason] = useState("")
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/opportunities/${opportunityId}`, {
        stage: "closed_lost",
        lostReason: lostReason.trim(),
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] })
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Opportunity marked as Closed Lost")
      setLostReason("")
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update opportunity")
    },
  })

  const canSubmit = !mutation.isPending && lostReason.trim().length >= 5

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setLostReason("")
      onOpenChange(isOpen)
    }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            Close as Lost: {opportunityName}
          </DialogTitle>
          <DialogDescription>
            Please provide a reason why this opportunity was lost. This helps
            improve future sales efforts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="lost-reason" className="text-sm font-medium">
            Loss Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="lost-reason"
            placeholder="e.g. Budget constraints, chose competitor, not the right time…"
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            className="min-h-[120px] resize-none"
            autoFocus
          />
          {lostReason.trim().length > 0 && lostReason.trim().length < 5 && (
            <p className="text-xs text-destructive">
              Please enter at least 5 characters.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setLostReason("")
              onOpenChange(false)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Closed Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
