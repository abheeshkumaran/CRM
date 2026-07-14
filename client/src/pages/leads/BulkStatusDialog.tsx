import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { bulkLeadAction } from "@/services/leadService"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"
import { toast } from "sonner"
import { Loader2, CheckCircle2 } from "lucide-react"

interface BulkStatusDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeads: string[]
  onSuccess: () => void
}

export function BulkStatusDialog({
  open,
  onOpenChange,
  selectedLeads,
  onSuccess,
}: BulkStatusDialogProps) {
  const { statuses, isLoading: loadingStatuses } = useLeadStatuses()
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const handleUpdateStatus = async () => {
    if (!selectedStatus) {
      toast.error("Please select a status")
      return
    }

    setLoading(true)
    try {
      await bulkLeadAction("update-status", selectedLeads, { status: selectedStatus })
      toast.success(`Successfully updated status for ${selectedLeads.length} leads`)
      onSuccess()
      onOpenChange(false)
      setSelectedStatus("")
    } catch (error: any) {
      console.error("Bulk status update failed:", error)
      toast.error(error.message || "Failed to update lead statuses")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Update Lead Status
          </DialogTitle>
          <DialogDescription>
            Change the status of {selectedLeads.length} selected leads.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              New Status
            </label>
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              disabled={loading || loadingStatuses}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingStatuses ? "Loading statuses..." : "Select a new status"} />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={loading || !selectedStatus}
            className="bg-primary text-primary-foreground"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
