import { copyToClipboard, isAdmin, getUserInfo } from "@/lib/utils";
import { useState } from "react"
import { MoreHorizontal, Pencil, Copy, Eye, Trash2, CreditCard, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { EditOpportunityDialog } from "@/components/EditOpportunityDialog"
import { type Opportunity } from "@/services/opportunityService"
import { ViewOpportunityDialog } from "@/components/ViewOpportunityDialog"
import { CloseWonDialog } from "@/components/CloseWonDialog"
import { deleteOpportunity } from "@/services/opportunityService"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DeleteConfirmationDialog } from "@/components/shared/DeleteConfirmationDialog"
import { EMISchedulePanel } from "@/components/EMISchedulePanel"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface OpportunityActionsProps {
  opportunity: Opportunity
}

export function OpportunityActions({ opportunity }: OpportunityActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEMIDialog, setShowEMIDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const queryClient = useQueryClient()

  const user = getUserInfo();
  const canDelete = true;

  const deleteMutation = useMutation({
    mutationFn: () => deleteOpportunity(opportunity.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] })
      toast.success("Opportunity deleted successfully")
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to delete opportunity")
    },
  })

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => copyToClipboard(opportunity.id)}>
            <Copy className="mr-2 h-4 w-4" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsViewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => {
            e.preventDefault();
            console.log('Edit clicked, opening dialog');
            setIsEditOpen(true);
          }}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Opportunity
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEMIDialog(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            View EMI Schedule
          </DropdownMenuItem>
          {opportunity.stage === 'closed_won' && opportunity.paymentStatus !== 'paid' && (
            <DropdownMenuItem onClick={() => setShowPaymentDialog(true)} className="text-success focus:text-success focus:bg-success/10 font-medium">
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment / EMI
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Opportunity
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <EditOpportunityDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        opportunity={opportunity}
      />

      <ViewOpportunityDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        opportunity={opportunity}
      />

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Opportunity"
        description="Are you sure you want to delete this opportunity? This action cannot be undone."
        confirmText="Delete Opportunity"
        isDeleting={deleteMutation.isPending}
      />

      <Dialog open={showEMIDialog} onOpenChange={setShowEMIDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>EMI Schedule</DialogTitle>
            <DialogDescription>
              Manage EMI installments for {opportunity.name}
            </DialogDescription>
          </DialogHeader>
          <EMISchedulePanel
            opportunityId={opportunity.id}
            paymentStatus={(opportunity as any).paymentStatus}
            opportunityAmount={opportunity.amount}
          />
        </DialogContent>
      </Dialog>

      {showPaymentDialog && (
        <CloseWonDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          opportunityId={opportunity.id}
          opportunityName={opportunity.name}
          amount={opportunity.amount}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["opportunities"] })
          }}
        />
      )}
    </>
  )
}
