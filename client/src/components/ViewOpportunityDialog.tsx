import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import { Calendar, DollarSign, Target, Package, Loader2, User, RefreshCw, ExternalLink, Trash2, MoreHorizontal } from "lucide-react"
import { useCurrency } from "@/contexts/CurrencyContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"
import { EMISchedulePanel } from "@/components/EMISchedulePanel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAssetUrl, isOrgAdmin, getUserInfo } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TimelineFeed from "@/components/shared/TimelineFeed"
import { useOpportunityLeadStatuses } from "@/hooks/useLeadStatuses"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export interface Opportunity {
  id: string
  name: string
  amount: number
  stage: string
  probability: number
  closeDate?: string
  priority?: string
  createdAt?: string
  account?: {
    name: string
    accountProducts?: Array<{
      id: string
      quantity: number
      status: string
      notes?: string
      product: {
        id: string
        name: string
        basePrice: number
        sku?: string
        currency?: string
      }
    }>
  }
  owner?: {
    id?: string
    _id?: string
    firstName: string
    lastName: string
    email?: string
    profileImage?: string
  }
  lead?: {
    id: string
    firstName?: string
    lastName?: string
    status?: string
    assignedTo?: {
      id: string
      firstName: string
      lastName: string
      email?: string
      profileImage?: string
    }
  }
  paymentStatus?: string
  leadStatus?: string
}

interface AccountProduct {
  id: string
  quantity: number
  status: string
  notes?: string
  product: {
    id: string
    name: string
    basePrice: number
    sku?: string
    currency?: string
  }
}

interface ViewOpportunityDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  opportunity: Opportunity
}

export function ViewOpportunityDialog({ children, open, onOpenChange, opportunity }: ViewOpportunityDialogProps) {
  const navigate = useNavigate()
  const { formatCurrency } = useCurrency()
  const queryClient = useQueryClient()
  const { statuses: leadStatuses } = useOpportunityLeadStatuses()
  const [noteText, setNoteText] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)


  // Fetch full opportunity details when dialog opens
  const { data: fullOpportunity, isLoading } = useQuery({
    queryKey: ['opportunity', opportunity.id],
    queryFn: async () => {
      const response = await api.get(`/opportunities/${opportunity.id}`)
      return response.data
    },
    enabled: open === true, // Only fetch when dialog is open
  })

  // Use full opportunity data if available, otherwise use the passed opportunity
  const displayOpportunity = fullOpportunity || opportunity

  const productTotal = displayOpportunity.account?.accountProducts?.reduce(
    (sum: number, ap: AccountProduct) => sum + (ap.product.basePrice * ap.quantity),
    0
  ) || 0

  const isAmountDifferent = Math.abs(productTotal - displayOpportunity.amount) > 0.01

  const syncMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/opportunities/${displayOpportunity.id}`, {
        amount: productTotal
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', displayOpportunity.id] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success("Opportunity amount synced with products")
    },
    onError: () => {
      toast.error("Failed to sync amount")
    }
  })

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setIsAddingNote(true)
    try {
      await api.post('/interactions', {
        opportunity: displayOpportunity.id,
        onModel: 'Opportunity',
        relatedTo: displayOpportunity.id,
        type: 'note',
        description: noteText,
        date: new Date().toISOString(),
        subject: 'Note'
      })
      setNoteText('')
      toast.success('Note added successfully')
      queryClient.invalidateQueries({ queryKey: ['timeline', 'opportunity', displayOpportunity.id] })
    } catch (error) {
      toast.error('Failed to add note')
    } finally {
      setIsAddingNote(false)
    }
  }

  // Fix for ReferenceError: define missing variables (Please do not overwrite this)
  const canDeleteLead = true;

  const removeLeadMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/opportunities/${displayOpportunity.id}`, { leadId: null })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', displayOpportunity.id] })
      queryClient.invalidateQueries({ queryKey: ['opportunities'] })
      toast.success("Lead unlinked successfully")
    },
    onError: () => {
      toast.error("Failed to unlink lead")
    }
  })

  const handleDeleteLead = (leadId: string) => {
    if (window.confirm("Are you sure you want to unlink this lead from the opportunity?")) {
      removeLeadMutation.mutate()
    }
  }

  // Debug: Log the opportunity data
  console.log('Opportunity data:', displayOpportunity)
  console.log('Has lead?:', !!displayOpportunity.lead)
  console.log('Lead data:', displayOpportunity.lead)

  // Generate a human-readable ID from the opportunity
  const getReadableId = () => {
    if (!displayOpportunity.createdAt) return displayOpportunity.id.slice(0, 8).toUpperCase()

    const date = new Date(displayOpportunity.createdAt)
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const shortId = displayOpportunity.id.slice(0, 6).toUpperCase()

    return `OPP-${year}${month}${day}-${shortId}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{displayOpportunity.name}</DialogTitle>
          <DialogDescription>
            Opportunity Details
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="timeline">Timeline & Files</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="grid gap-6 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-500">Stage</span>
                  <Badge variant="secondary" className="mt-1 capitalize w-fit">{displayOpportunity.stage?.replace('_', ' ') || 'Unknown'}</Badge>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-500">Probability</span>
                  <span className="text-lg font-bold flex items-center mt-1">
                    <Target className="w-4 h-4 mr-1 text-blue-500" />
                    {displayOpportunity.probability}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Value</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(displayOpportunity.amount)}
                  </span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Close Date</span>
                  </div>
                  <span className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    {displayOpportunity.closeDate ? new Date(displayOpportunity.closeDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Owner Information */}
              {displayOpportunity.owner && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Opportunity Owner</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                      <AvatarImage
                        src={getAssetUrl(displayOpportunity.owner.profileImage)}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold">
                        {displayOpportunity.owner.firstName?.[0]}{displayOpportunity.owner.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {displayOpportunity.owner.firstName} {displayOpportunity.owner.lastName}
                      </div>
                      {displayOpportunity.owner.email && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {displayOpportunity.owner.email}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Lead Information */}
              {displayOpportunity.lead && (
                <div
                  className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-all group"
                  onClick={() => {
                    onOpenChange?.(false);
                    navigate(`/leads/${displayOpportunity.lead.id}`);
                  }}
                >
                  <div className="flex items-center justify-between mb-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Linked Lead</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Status:</span>
                      <Select
                        value={displayOpportunity.leadStatus || displayOpportunity.lead?.status || ""}
                        onValueChange={async (newStatus) => {
                          try {
                            await api.put(`/opportunities/${displayOpportunity.id}`, { leadStatus: newStatus })
                            queryClient.invalidateQueries({ queryKey: ['opportunity', displayOpportunity.id] })
                            queryClient.invalidateQueries({ queryKey: ['opportunities'] })
                            toast.success("Lead status updated successfully")
                          } catch (error) {
                            toast.error("Failed to update lead status")
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs font-semibold px-2 py-0.5 rounded bg-white text-emerald-600 border border-green-200 w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {leadStatuses.map((ls) => (
                            <SelectItem key={ls.id} value={ls.id} className="text-xs capitalize">
                              {ls.label || ls.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <ExternalLink className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      {canDeleteLead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 ml-1 rounded-full hover:bg-red-100 text-red-600 hover:text-red-700 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLead(displayOpportunity.lead!.id);
                          }}
                          title="Delete Lead from Opportunity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {displayOpportunity.lead.assignedTo ? (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-gray-800 shadow-sm">
                        <AvatarImage
                          src={getAssetUrl(displayOpportunity.lead.assignedTo.profileImage)}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold">
                          {displayOpportunity.lead.assignedTo.firstName?.[0]}{displayOpportunity.lead.assignedTo.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          {displayOpportunity.lead.firstName} {displayOpportunity.lead.lastName}
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white/50">Lead</Badge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Owner: {displayOpportunity.lead.assignedTo.firstName} {displayOpportunity.lead.assignedTo.lastName}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {displayOpportunity.lead.firstName} {displayOpportunity.lead.lastName} (Unassigned)
                    </div>
                  )}
                </div>
              )}

              {/* Opportunity ID */}
              <div>
                <span className="text-sm font-medium text-gray-500 mb-2 block">Opportunity ID</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-semibold text-blue-600 dark:text-blue-400 select-all">
                    {getReadableId()}
                  </code>
                </div>
              </div>

              {displayOpportunity.account?.accountProducts && displayOpportunity.account.accountProducts.length > 0 && (
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      Associated Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {displayOpportunity.account.accountProducts.map((ap: AccountProduct) => (
                      <div key={ap.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{ap.product.name}</div>
                          {ap.product.sku && (
                            <div className="text-xs text-muted-foreground">SKU: {ap.product.sku}</div>
                          )}
                          {ap.notes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">{ap.notes}</div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-semibold">
                            {formatCurrency(ap.product.basePrice * ap.quantity)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ap.quantity} × {formatCurrency(ap.product.basePrice)}
                          </div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {ap.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Total Product Value:</span>
                        {isAmountDifferent && (
                          <span className="text-[10px] text-amber-600 font-semibold animate-pulse">
                            Differs from Opportunity Amount
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(productTotal)}
                        </span>
                        {isAmountDifferent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 gap-1.5 text-xs bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                            disabled={syncMutation.isPending}
                            onClick={() => syncMutation.mutate()}
                          >
                            {syncMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Sync
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* EMI Schedule */}
              <EMISchedulePanel
                opportunityId={displayOpportunity.id}
                paymentStatus={displayOpportunity.paymentStatus}
                opportunityAmount={displayOpportunity.amount}
              />
            </TabsContent>

            <TabsContent value="timeline" className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              <div className="flex flex-col gap-2 p-3 bg-muted/40 rounded-lg border border-border/50">
                <Textarea
                  placeholder="Add a note to this deal..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="min-h-[60px] bg-background border-border text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={isAddingNote || !noteText.trim()}
                  className="self-end text-xs h-8"
                >
                  {isAddingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Add Note
                </Button>
              </div>
              <TimelineFeed type="opportunity" id={displayOpportunity.id} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
