import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateFollowUp } from '@/services/followUpService';
import { createInteraction } from '@/services/interactionService';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface UpdateFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    subject: string;
    dueDate: string;
    status: string;
    leadId?: string;
    lead?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  onSuccess?: () => void;
}

export function UpdateFollowUpDialog({ open, onOpenChange, task, onSuccess }: UpdateFollowUpDialogProps) {
  const [status, setStatus] = useState<"not_started" | "in_progress" | "completed" | "deferred">(task.status as any);
  const [remark, setRemark] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Reschedule date/time
  const initialDate = new Date(task.dueDate);
  const [date, setDate] = useState(initialDate.toISOString().split('T')[0]);
  const [time, setTime] = useState(initialDate.toTimeString().slice(0, 5));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Combine date/time for new due date
      const [year, month, day] = date.split('-').map(Number);
      const [hours, mins] = time.split(':').map(Number);
      const newDueDate = new Date(year, month - 1, day, hours, mins).toISOString();

      // 2. Update Follow-up
      await updateFollowUp(task.id, {
        status,
        dueDate: newDueDate
      });

      const leadId = task.leadId || task.lead?.id;
      if (leadId) {
        // 4. Create Interaction (Remark) if provided
        if (remark.trim()) {
          await createInteraction({
            type: 'note',
            direction: 'outbound',
            status: 'completed',
            subject: `Follow-up Remark: ${task.subject}`,
            description: remark,
            date: new Date().toISOString(),
            relatedTo: leadId,
            onModel: 'Lead'
          });
        }
      }

      toast.success('Follow-up updated successfully');
      queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (leadId) {
        queryClient.invalidateQueries({ queryKey: ['timeline', 'lead', leadId] });
      }
      onSuccess?.();
      onOpenChange(false);
      setRemark('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Failed to update follow-up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Update Follow-up</DialogTitle>
          <DialogDescription>
            Update status, add remarks, or reschedule this task.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rescheduleDate">Reschedule Date</Label>
              <Input
                id="rescheduleDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rescheduleTime">Time</Label>
              <Input
                id="rescheduleTime"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks / Notes</Label>
            <Textarea
              id="remarks"
              placeholder="Logged call, spoke with client..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Save Updates'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
