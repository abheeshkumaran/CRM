import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, X } from "lucide-react"
import { Link } from "react-router-dom"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"
import { getOrganisation, updateOrganisation } from "@/services/settingsService"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export default function ShufflerSettingsPage() {
  const { statuses } = useLeadStatuses()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState("")
  const [shufflingLeads, setShufflingLeads] = useState("")
  const [shuffleBefore, setShuffleBefore] = useState("")
  const [shuffleTime, setShuffleTime] = useState("")

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  })

  useEffect(() => {
    if (org?.shufflerConfig) {
      setShufflingLeads(org.shufflerConfig.statuses?.join('\n') || "")
      setShuffleBefore(org.shufflerConfig.shuffleBeforeDays?.toString() || "")
      setShuffleTime(org.shufflerConfig.shuffleTime || "")
    }
  }, [org])

  const mutation = useMutation({
    mutationFn: updateOrganisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] })
      toast.success("Shuffler settings saved successfully")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to save settings")
    }
  })

  const handleSave = () => {
    mutation.mutate({
      shufflerConfig: {
        statuses: shufflingLeads.split('\n').map(s => s.trim()).filter(Boolean),
        shuffleBeforeDays: parseInt(shuffleBefore) || 0,
        shuffleTime: shuffleTime
      }
    })
  }

  const filteredStatuses = statuses.filter(
    (status) => status.id !== "won" && status.id !== "lost" && status.id !== "closed_won" && status.id !== "closed_lost"
  )

  const handleStatusSelect = (val: string) => {
    if (!val) return;

    setShufflingLeads(prev => {
      const currentList = prev.split('\n').map(s => s.trim()).filter(Boolean);
      if (!currentList.includes(val)) {
        currentList.push(val);
      }
      return currentList.join('\n');
    });

    // Auto reset the dropdown list for next selection
    setTimeout(() => setSelectedStatus(""), 0);
  }

  const removeStatus = (statusToRemove: string) => {
    setShufflingLeads(prev => {
      const currentList = prev.split('\n').map(s => s.trim()).filter(Boolean);
      return currentList.filter(s => s !== statusToRemove).join('\n');
    });
  }

  const selectedList = shufflingLeads.split('\n').map(s => s.trim()).filter(Boolean);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Set Shuffler</h2>
          <p className="text-muted-foreground">
            Configure lead shuffling settings for your organisation.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shuffler Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is the Set Shuffler. You can shuffle the leads and assign them to team members in a fair and balanced way. You can set rules to control how the leads are shuffled and assigned.
          </p>

          <div className="grid gap-6 mt-8 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="lead-status">Lead Status</Label>
              <Select value={selectedStatus} onValueChange={handleStatusSelect}>
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
              <Label>Shuffling Leads</Label>
              <div className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm">
                {selectedList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedList.map((statusId, index) => {
                      const statusObj = statuses.find(s => s.id === statusId);
                      const label = statusObj ? statusObj.label : statusId;
                      return (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-sm py-1">
                          {label}
                          <button
                            type="button"
                            onClick={() => removeStatus(statusId)}
                            className="text-muted-foreground hover:text-foreground focus:outline-none ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-muted-foreground">No lead statuses selected...</span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="space-y-2 flex-1">
                <Label htmlFor="shuffle-before">Shuffle Before (Days)</Label>
                <Input
                  id="shuffle-before"
                  type="number"
                  min="0"
                  value={shuffleBefore}
                  onChange={(e) => setShuffleBefore(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shuffle-time">Time</Label>
                <Input
                  id="shuffle-time"
                  type="time"
                  value={shuffleTime}
                  onChange={(e) => setShuffleTime(e.target.value)}
                  className="w-full sm:w-32"
                />
              </div>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving..." : "Set Shuffler"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
