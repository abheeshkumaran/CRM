import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"

interface SetShufflerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetShufflerDialog({ open, onOpenChange }: SetShufflerDialogProps) {
  const { statuses } = useLeadStatuses()
  const [selectedStatus, setSelectedStatus] = useState("")
  const [shufflingLeads, setShufflingLeads] = useState("")
  const [assignedBefore, setAssignedBefore] = useState("")

  const filteredStatuses = statuses.filter(
    (status) => status.id !== "won" && status.id !== "lost" && status.id !== "closed_won" && status.id !== "closed_lost"
  )

  const handleSave = () => {
    // Save logic here (not required as per instructions, just close)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Shuffler</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lead-status">Lead Status</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="lead-status">
                <SelectValue placeholder="Select lead status" />
              </SelectTrigger>
              <SelectContent>
                {filteredStatuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shuffling-leads">Shuffling Leads</Label>
            <Textarea
              id="shuffling-leads"
              value={shufflingLeads}
              onChange={(e) => setShufflingLeads(e.target.value)}
              placeholder="Leads to shuffle..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned-before">Assigned Before</Label>
            <Input
              id="assigned-before"
              type="datetime-local"
              value={assignedBefore}
              onChange={(e) => setAssignedBefore(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} className="w-full">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
