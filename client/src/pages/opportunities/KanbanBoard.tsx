import { useState, useMemo } from "react";
import { type Opportunity, updateOpportunity } from "@/services/opportunityService";
import { CloseWonDialog } from "@/components/CloseWonDialog";
import { CloseLostDialog } from "@/components/CloseLostDialog";
import { ViewOpportunityDialog } from "@/components/ViewOpportunityDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAssetUrl } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";
import { MoreHorizontal, DollarSign, Calendar, AlertCircle, CheckCircle2, CreditCard, Clock, Eye, Pencil, Trash2, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { differenceInDays } from "date-fns";
import { isOrgAdmin, getUserInfo } from "@/lib/utils";
import { EditOpportunityDialog } from "@/components/EditOpportunityDialog";
import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteOpportunity } from "@/services/opportunityService";
import { useOpportunityLeadStatuses } from "@/hooks/useLeadStatuses";
import { api } from "@/services/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface KanbanBoardProps {
  opportunities: Opportunity[];
}

const STAGES: { id: string; label: string; color: string; mergedFrom?: string[] }[] = [
  {
    id: "expected",
    label: "Expected",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    mergedFrom: ["prospecting", "qualification", "proposal", "negotiation", "pre_qualified_lead", "qualified_lead"]
  },
  { id: "closed_won", label: "Closed Won", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { id: "closed_lost", label: "Closed Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
];

export function KanbanBoard({ opportunities }: KanbanBoardProps) {
  const { formatCurrency } = useCurrency();
  // Removed local state that was preventing updates from props. 
  // We can use the props directly since OpportunitiesPage already manages the data.
  // Optimistic updates for drag-and-drop can still be handled if needed, 
  // but the 5s refetch will sync it back anyway.
  const [closeWonOpp, setCloseWonOpp] = useState<Opportunity | null>(null);
  const [closeLostOpp, setCloseLostOpp] = useState<Opportunity | null>(null);
  const [viewDetailsOpp, setViewDetailsOpp] = useState<Opportunity | null>(null);
  const [editOpp, setEditOpp] = useState<Opportunity | null>(null);
  const [deleteOpp, setDeleteOpp] = useState<Opportunity | null>(null);

  const queryClient = useQueryClient();
  const { statuses: leadStatuses } = useOpportunityLeadStatuses();
  const user = getUserInfo();
  const canDelete = true;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteOpportunity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Opportunity deleted successfully");
      setDeleteOpp(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete opportunity");
    }
  });

  // Group opportunities by stage
  const columns = useMemo(() => {
    const cols: Record<string, Opportunity[]> = {};
    STAGES.forEach((stage) => (cols[stage.id] = []));

    opportunities.forEach((opp: Opportunity) => {
      const stageId = opp.stage || "prospecting";

      // Find if this stage belongs to a merged column
      const targetColumn = STAGES.find(s =>
        s.id === stageId || (s.mergedFrom && s.mergedFrom.includes(stageId))
      );

      if (targetColumn) {
        cols[targetColumn.id].push(opp);
      } else {
        // Fallback to first stage if somehow it doesn't match
        cols[STAGES[0].id].push(opp);
      }
    });
    return cols;
  }, [opportunities]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const opportunity = opportunities.find(o => o.id === id);

    if (stageId === 'closed_won' && opportunity && opportunity.stage !== 'closed_won') {
      setCloseWonOpp(opportunity);
      return;
    }

    if (stageId === 'closed_lost' && opportunity && opportunity.stage !== 'closed_lost') {
      setCloseLostOpp(opportunity);
      return;
    }

    // Determine the actual stage value to send to backend
    let actualStage = stageId;
    if (stageId === 'expected') {
      actualStage = 'prospecting';
    }

    try {
      await updateOpportunity(id, { stage: actualStage as Opportunity['stage'] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    } catch (error) {
      console.error("Failed to update opportunity stage:", error);
    }
  };

  return (
    <div className="flex h-full overflow-x-auto snap-x snap-mandatory gap-4 pb-4 px-2 scrollbar-hide">
      <TooltipProvider>
        {STAGES.map((stage) => {
          const stageOpps = columns[stage.id] || [];
          const totalValue = stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-[280px] sm:w-80 bg-muted/50 rounded-xl border border-border flex flex-col snap-center first:ml-2 last:mr-2"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="p-3 border-b border-border flex flex-col gap-2 bg-background/50 backdrop-blur-sm sticky top-0 rounded-t-xl z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={`${stage.color} font-semibold`}>
                      {stage.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium bg-background px-1.5 py-0.5 rounded-md border border-border">
                      {stageOpps.length}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-medium text-muted-foreground pl-1">
                  {formatCurrency(totalValue)}
                </div>
              </div>

              <ScrollArea className="flex-1 p-3">
                <div className="flex flex-col gap-3">
                  {stageOpps.map((opp) => {
                    const daysInStage = differenceInDays(new Date(), new Date(opp.updatedAt));
                    const isStagnant = daysInStage > 30;
                    const isWarning = daysInStage > 14 && daysInStage <= 30;

                    return (
                      <Card
                        key={opp.id}
                        draggable={opp.stage !== 'closed_won' && opp.stage !== 'closed_lost'}
                        onDragStart={(e) => {
                          if (opp.stage === 'closed_won' || opp.stage === 'closed_lost') {
                            e.preventDefault();
                            return;
                          }
                          handleDragStart(e, opp.id);
                        }}
                        className={`${opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' ? 'cursor-move hover:shadow-md' : 'opacity-80'} transition-all duration-200 border-border bg-card group ${isStagnant ? 'border-l-4 border-l-destructive' : isWarning ? 'border-l-4 border-l-warning' : ''
                          }`}
                      >
                        <CardContent className="p-3 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              {opp.account && (
                                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide truncate max-w-[150px]">
                                  {opp.account.name}
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <h4 className="font-semibold text-sm line-clamp-2 text-card-foreground leading-tight">
                                  {opp.name}
                                </h4>
                                {opp.paymentStatus === 'paid' && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                                    </TooltipTrigger>
                                    <TooltipContent>Payment Complete</TooltipContent>
                                  </Tooltip>
                                )}
                                {opp.paymentStatus === 'emi' && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <CreditCard className="h-4 w-4 text-amber-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>EMI Activated</TooltipContent>
                                  </Tooltip>
                                )}
                                {opp.paymentStatus === 'partial' && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Clock className="h-4 w-4 text-sky-500" />
                                    </TooltipTrigger>
                                    <TooltipContent>Partially Paid</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewDetailsOpp(opp)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setEditOpp(opp)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>

                                {opp.stage !== 'closed_won' && opp.stage !== 'closed_lost' && (
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>Move to Stage</DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                        {STAGES.map((s) => (
                                          <DropdownMenuItem
                                            key={s.id}
                                            disabled={s.id === opp.stage || (s.id === 'expected' && STAGES[0].mergedFrom?.includes(opp.stage))}
                                            onClick={() => {
                                              const mockEvent = {
                                                preventDefault: () => { },
                                                dataTransfer: {
                                                  getData: () => opp.id
                                                }
                                              } as unknown as React.DragEvent;
                                              handleDrop(mockEvent, s.id);
                                              toast.success(`Moved to ${s.label}`);
                                            }}
                                          >
                                            {s.label}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                )}

                                {opp.stage === 'closed_won' && opp.paymentStatus !== 'paid' && (
                                  <DropdownMenuItem
                                    onClick={() => setCloseWonOpp(opp)}
                                    className="text-success focus:text-success focus:bg-success/10 font-medium"
                                  >
                                    <DollarSign className="mr-2 h-4 w-4" />
                                    Record Payment / EMI
                                  </DropdownMenuItem>
                                )}

                                {canDelete && (
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                    onClick={() => setDeleteOpp(opp)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal border-border text-muted-foreground">
                              {opp.leadSource || 'Direct'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20 capitalize">
                              {opp.stage.replace(/_/g, ' ')}
                            </Badge>
                            {(isStagnant || isWarning) && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <div className={`p-0.5 rounded-full ${isStagnant ? 'text-destructive bg-destructive/10' : 'text-warning bg-warning/10'}`}>
                                    <AlertCircle className="h-3 w-3" />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>No activity for {daysInStage} days</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* <div className="flex items-center gap-1.5 w-full mt-1 pt-1.5 border-t border-dashed border-border/60" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lead Status:</span>
                            <Select
                              value={opp.leadStatus || opp.lead?.status || ""}
                              onValueChange={async (newStatus) => {
                                try {
                                  await api.put(`/opportunities/${opp.id}`, { leadStatus: newStatus });
                                  queryClient.invalidateQueries({ queryKey: ["opportunities"] });
                                  toast.success("Lead status updated successfully");
                                } catch (error) {
                                  toast.error("Failed to update lead status");
                                }
                              }}
                            >
                              <SelectTrigger className="h-6 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 max-w-[145px] truncate">
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
                          </div> */}

                          <div className="flex items-end justify-between pt-2 border-t border-border mt-1">
                            <div className="space-y-1">
                              {opp.amount > 0 && (
                                <div className="flex items-center gap-1.5 text-sm text-card-foreground font-bold">
                                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                                  {formatCurrency(opp.amount)}
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : 'No date'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {opp.probability}%
                              </div>
                              {opp.owner && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Avatar className="h-6 w-6 border border-background shadow-sm">
                                      <AvatarImage
                                        src={getAssetUrl(opp.owner.profileImage)}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                        {opp.owner.firstName?.[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Owner: {opp.owner.firstName} {opp.owner.lastName}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </TooltipProvider >

      {closeWonOpp && (
        <CloseWonDialog
          open={!!closeWonOpp}
          onOpenChange={(open) => !open && setCloseWonOpp(null)}
          opportunityId={closeWonOpp.id}
          opportunityName={closeWonOpp.name}
          amount={closeWonOpp.amount}
          onSuccess={() => {
            // Rely on parent refetch or manual refresh
          }}
        />
      )}

      {closeLostOpp && (
        <CloseLostDialog
          open={!!closeLostOpp}
          onOpenChange={(open) => !open && setCloseLostOpp(null)}
          opportunityId={closeLostOpp.id}
          opportunityName={closeLostOpp.name}
        />
      )}

      {viewDetailsOpp && (
        <ViewOpportunityDialog
          open={!!viewDetailsOpp}
          onOpenChange={(open) => !open && setViewDetailsOpp(null)}
          opportunity={viewDetailsOpp}
        />
      )}

      {editOpp && (
        <EditOpportunityDialog
          open={!!editOpp}
          onOpenChange={(open) => !open && setEditOpp(null)}
          opportunity={editOpp}
        />
      )}

      {deleteOpp && (
        <DeleteConfirmationDialog
          open={!!deleteOpp}
          onOpenChange={(open) => !open && setDeleteOpp(null)}
          onConfirm={() => deleteMutation.mutate(deleteOpp.id)}
          title="Delete Opportunity"
          description={`Are you sure you want to delete "${deleteOpp.name}"? This action cannot be undone.`}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div >
  );
}
