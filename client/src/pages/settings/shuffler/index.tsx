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
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, X } from "lucide-react"
import { Link } from "react-router-dom"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"
import { getOrganisation, updateOrganisation, triggerShuffleNow, getBranches } from "@/services/settingsService"
import { getUsers } from "@/services/userService"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export default function ShufflerSettingsPage() {
  const { statuses } = useLeadStatuses()
  const queryClient = useQueryClient()

  const [selectedStatus, setSelectedStatus] = useState("")
  const [shufflingLeads, setShufflingLeads] = useState("")
  const [shuffleBefore, setShuffleBefore] = useState("")
  const [shuffleTime, setShuffleTime] = useState("")
  const [shuffleFromDate, setShuffleFromDate] = useState("")
  const [shuffleToDate, setShuffleToDate] = useState("")
  const [isAutoShufflingOn, setIsAutoShufflingOn] = useState(false)

  const [branchDropdownVal, setBranchDropdownVal] = useState("")
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([])
  const [userDropdownVal, setUserDropdownVal] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })

  useEffect(() => {
    if (org?.shufflerConfig) {
      setShufflingLeads(org.shufflerConfig.statuses?.join('\n') || "")
      setShuffleBefore(org.shufflerConfig.shuffleBeforeDays?.toString() || "")
      setShuffleTime(org.shufflerConfig.shuffleTime || "")
      setShuffleFromDate(org.shufflerConfig.shuffleFromDate || "")
      setShuffleToDate(org.shufflerConfig.shuffleToDate || "")
      setIsAutoShufflingOn(org.shufflerConfig.isAutoShufflingOn || false)
      setSelectedBranchIds(org.shufflerConfig.branches || [])
      setSelectedUserIds(org.shufflerConfig.users || [])
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

  const shuffleNowMutation = useMutation({
    mutationFn: triggerShuffleNow,
    onSuccess: (data) => {
      toast.success(data.message || "Shuffle completed successfully")
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to execute shuffle")
    }
  })

  const handleSave = () => {
    mutation.mutate({
      shufflerConfig: {
        ...(org?.shufflerConfig || {}),
        statuses: shufflingLeads.split('\n').map(s => s.trim()).filter(Boolean),
        shuffleBeforeDays: parseInt(shuffleBefore) || 0,
        shuffleTime: shuffleTime,
        shuffleFromDate: shuffleFromDate,
        shuffleToDate: shuffleToDate,
        isAutoShufflingOn: isAutoShufflingOn,
        branches: selectedBranchIds,
        users: selectedUserIds
      }
    })
  }

  const handleShuffleNow = () => {
    // Save first, then trigger shuffle on success
    mutation.mutate({
      shufflerConfig: {
        ...(org?.shufflerConfig || {}),
        statuses: shufflingLeads.split('\n').map(s => s.trim()).filter(Boolean),
        shuffleBeforeDays: parseInt(shuffleBefore) || 0,
        shuffleTime: shuffleTime,
        shuffleFromDate: shuffleFromDate,
        shuffleToDate: shuffleToDate,
        isAutoShufflingOn: isAutoShufflingOn,
        branches: selectedBranchIds,
        users: selectedUserIds
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['organisation'] });
        shuffleNowMutation.mutate();
      }
    });
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

  const handleBranchSelect = (val: string) => {
    if (!val) return;

    if (val === "select-all") {
      const allBranchIds = branchList.map((b: any) => b.id);
      setSelectedBranchIds(allBranchIds);
      setTimeout(() => setBranchDropdownVal(""), 0);
      return;
    }

    setSelectedBranchIds(prev => {
      if (!prev.includes(val)) return [...prev, val];
      return prev;
    });
    setTimeout(() => setBranchDropdownVal(""), 0);
  }

  const removeBranch = (branchId: string) => {
    setSelectedBranchIds(prev => prev.filter(id => id !== branchId));

    // Also remove any users from Users (Selected) who belong to this removed branch
    const currentUserList = Array.isArray(users) ? users : (users?.users || []);
    setSelectedUserIds(prev => prev.filter(userId => {
      const userObj = currentUserList.find((u: any) => u.id === userId);
      return userObj?.branch?.id !== branchId;
    }));
  }

  const handleUserSelect = (val: string) => {
    if (!val) return;

    if (val === "select-all") {
      const allUserIds = filteredUsers.map((u: any) => u.id);
      setSelectedUserIds(allUserIds);
      setTimeout(() => setUserDropdownVal(""), 0);
      return;
    }

    setSelectedUserIds(prev => {
      if (!prev.includes(val)) return [...prev, val];
      return prev;
    });
    setTimeout(() => setUserDropdownVal(""), 0);
  }

  const removeUser = (userId: string) => {
    setSelectedUserIds(prev => prev.filter(id => id !== userId));
  }

  const selectedList = shufflingLeads.split('\n').map(s => s.trim()).filter(Boolean);
  const branchList = Array.isArray(branches) ? branches : (branches?.branches || []);
  const userList = Array.isArray(users) ? users : (users?.users || []);

  const filteredUsers = selectedBranchIds.length > 0
    ? userList.filter((u: any) => u.branch && selectedBranchIds.includes(u.branch.id) && !u.role?.name?.toLowerCase().includes('admin'))
    : []; // Empty array when no branch is selected

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 max-w-5xl">
            {/* Left Column */}
            <div className="space-y-6 flex flex-col">
              <div className="flex items-center justify-between border border-border p-4 rounded-lg">
                <div>
                  <Label className="text-base font-semibold">Auto Shuffling</Label>
                  <p className="text-sm text-muted-foreground">Turn the automatic lead shuffler on or off</p>
                </div>
                <Switch
                  checked={isAutoShufflingOn}
                  onCheckedChange={setIsAutoShufflingOn}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500"
                />
              </div>

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
                <Label htmlFor="branch-select">Branches</Label>
                <Select value={branchDropdownVal} onValueChange={handleBranchSelect}>
                  <SelectTrigger id="branch-select">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branchList.length > 0 && <SelectItem value="select-all" className="font-semibold text-primary">Select All</SelectItem>}
                    {branchList.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="user-select">Users</Label>
                <Select value={userDropdownVal} onValueChange={handleUserSelect}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredUsers.length > 0 && <SelectItem value="select-all" className="font-semibold text-primary">Select All</SelectItem>}
                    {filteredUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mt-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="shuffle-from-date">Shuffle From</Label>
                  <Input
                    id="shuffle-from-date"
                    type="date"
                    value={shuffleFromDate}
                    onChange={(e) => setShuffleFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="shuffle-to-date">Shuffle To</Label>
                  <Input
                    id="shuffle-to-date"
                    type="date"
                    value={shuffleToDate}
                    onChange={(e) => setShuffleToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 mt-auto pt-2">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="shuffle-before">Auto shuffle count (days)</Label>
                  <Input
                    id="shuffle-before"
                    type="number"
                    min="0"
                    value={shuffleBefore}
                    onChange={(e) => setShuffleBefore(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <Label htmlFor="shuffle-time">Time</Label>
                  <Input
                    id="shuffle-time"
                    type="time"
                    value={shuffleTime}
                    onChange={(e) => setShuffleTime(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button
                  className="w-full sm:w-auto"
                  variant="outline"
                  type="button"
                >
                  Change Period
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : "Set Shuffler"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  type="button"
                  onClick={handleShuffleNow}
                  disabled={shuffleNowMutation.isPending}
                >
                  {shuffleNowMutation.isPending ? "Shuffling..." : "Shuffle Now"}
                </Button>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div className="space-y-2 flex flex-col">
                <Label>Shuffling Leads (Selected)</Label>
                <div className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm flex flex-wrap gap-2 content-start min-h-[100px]">
                  {selectedList.length > 0 ? (
                    selectedList.map((statusId, index) => {
                      const statusObj = statuses.find(s => s.id === statusId);
                      const label = statusObj ? statusObj.label : statusId;
                      return (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-sm py-1 h-fit">
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
                    })
                  ) : (
                    <span className="text-muted-foreground w-full text-center mt-4">No lead statuses selected...</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label>Branches (Selected)</Label>
                <div className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm flex flex-wrap gap-2 content-start min-h-[100px]">
                  {selectedBranchIds.length > 0 ? (
                    selectedBranchIds.map((branchId, index) => {
                      const branchObj = branchList.find((b: any) => b.id === branchId);
                      const label = branchObj ? branchObj.name : branchId;
                      return (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-sm py-1 h-fit">
                          {label}
                          <button
                            type="button"
                            onClick={() => removeBranch(branchId)}
                            className="text-muted-foreground hover:text-foreground focus:outline-none ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-muted-foreground w-full text-center mt-4">No branches selected...</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label>Users (Selected)</Label>
                <div className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm flex flex-wrap gap-2 content-start min-h-[100px]">
                  {selectedUserIds.length > 0 ? (
                    selectedUserIds.map((userId, index) => {
                      const userObj = userList.find((u: any) => u.id === userId);
                      const label = userObj ? `${userObj.firstName} ${userObj.lastName}` : userId;
                      return (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1 text-sm py-1 h-fit">
                          {label}
                          <button
                            type="button"
                            onClick={() => removeUser(userId)}
                            className="text-muted-foreground hover:text-foreground focus:outline-none ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })
                  ) : (
                    <span className="text-muted-foreground w-full text-center mt-4">No users selected...</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 flex flex-col">
                <Label>Date Range (Selected)</Label>
                <div className="w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm shadow-sm flex flex-wrap gap-2 content-start min-h-[50px]">
                  {shuffleFromDate || shuffleToDate ? (
                    <span className="text-foreground text-sm font-medium">
                      {shuffleFromDate ? new Date(shuffleFromDate).toLocaleDateString() : 'from the begining'} 
                      {' - '} 
                      {shuffleToDate ? new Date(shuffleToDate).toLocaleDateString() : 'last day'}
                    </span>
                  ) : (
                    <span className="text-muted-foreground w-full text-center mt-2">No date range selected...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
