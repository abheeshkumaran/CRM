
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Violation {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  violationTime: string;
  userExplanation?: string;
  managerExplanation?: string;
  previousOwner?: { firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string };
}

export function ViolationAlert() {
  const queryClient = useQueryClient();
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [explanation, setExplanation] = useState("");

  // Fetch Violations
  const { data } = useQuery({
    queryKey: ['violations'],
    queryFn: async () => {
      const response = await api.get('/leads/violations');
      return response.data;
    },
    refetchInterval: 60000 // Check every minute
  });

  const violations: Violation[] = Array.isArray(data?.violations) ? data.violations : [];

  // Filter for unresolved violations for the current user context
  // Ideally backend filters, but frontend can double check what needs action.
  // If I see it, I probably need to act on it if explanation is missing.
  // But backend should only return what I can see.

  // We assume backend returns violations that concern me.
  // If User Explanation empty -> User needs to provide.
  // If Manager Explanation empty -> Manager needs to provide (if I am manager).

  // Simplify: Just show list of pending explanations.
  const pendingViolations = violations.filter(v => !v.userExplanation || !v.managerExplanation);

  const mutation = useMutation({
    mutationFn: async (data: { leadId: string; explanation: string; type: 'user' | 'manager' }) => {
      const response = await api.post('/leads/explanation', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      toast.success("Explanation submitted successfully");
      setSelectedViolation(null);
      setExplanation("");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || "Failed to submit");
    }
  });

  if (pendingViolations.length === 0) return null;

  const handleSubmit = () => {
    if (!selectedViolation) return;

    // Determine type based on current user vs previous owner
    const userInfoStr = localStorage.getItem('userInfo');
    let explanationType: 'user' | 'manager' = 'user';

    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);

        // If current user's explanation is already provided, they must be the manager
        if (selectedViolation.userExplanation && !selectedViolation.managerExplanation) {
          explanationType = 'manager';
        }
        // If neither explanation exists, check if current user was the previous owner
        else if (!selectedViolation.userExplanation) {
          // User assigned to = current user means they are the one who got the lead
          // Previous owner = current user means they need to explain
          const assignedToName = `${selectedViolation.assignedTo?.firstName || ''} ${selectedViolation.assignedTo?.lastName || ''}`.trim();
          const currentUserName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim();

          if (assignedToName !== currentUserName) {
            explanationType = 'manager';
          }
        }
      } catch {
        // Fallback to 'user' if parse fails
      }
    }

    mutation.mutate({
      leadId: selectedViolation.id,
      explanation,
      type: explanationType
    });
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {pendingViolations.slice(0, 3).map(v => (
          <Alert key={v.id} variant="destructive" className="w-[350px] bg-destructive/5 dark:bg-destructive/10 border-destructive/20 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lead Assignment Violation: {v.firstName} {v.lastName}</AlertTitle>
            <AlertDescription className="mt-2 flex flex-col gap-2">
              <span className="text-xs opacity-90">
                This lead was rotated due to inactivity on {new Date(v.violationTime).toLocaleDateString()}.
                An explanation is required.
              </span>
              <Button
                variant="outline"
                size="sm"
                className="w-full bg-background hover:bg-destructive/10 border-destructive/20"
                onClick={() => setSelectedViolation(v)}
              >
                Provide Explanation
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>

      <Dialog open={!!selectedViolation} onOpenChange={(open) => !open && setSelectedViolation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Required Explanation</DialogTitle>
            <DialogDescription>
              Lead <strong>{selectedViolation?.firstName} {selectedViolation?.lastName}</strong> was automatically rotated.
              Please explain the lack of activity.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Reason for delay..."
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="min-h-[100px]"
          />

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setSelectedViolation(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!explanation || mutation.isPending}
            >
              {mutation.isPending && "Submitting..."}
              {!mutation.isPending && "Submit Explanation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
