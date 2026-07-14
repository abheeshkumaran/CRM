import { useState, useEffect } from 'react';
import { createFollowUp } from '@/services/followUpService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CreateFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
  defaultValues?: {
    assignedTo?: string;
    relatedTo?: string;
    onModel?: string;
  };
  onSuccess: () => void;
}

export function CreateFollowUpDialog({ open, onOpenChange, leadId, defaultValues, onSuccess }: CreateFollowUpDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form States
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (open) {
      setSubject('Follow up');
      setDescription('');
      setPriority('medium');
      setDate('');
      setTime('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!date || !time) {
        toast.error('Please select both date and time');
        setIsLoading(false);
        return;
      }
      
      const [year, month, day] = date.split('-').map(Number);
      const [hours, mins] = time.split(':').map(Number);
      const newDueDate = new Date(year, month - 1, day, hours, mins).toISOString();

      const payload: any = {
        subject,
        description,
        priority,
        dueDate: newDueDate,
        status: 'not_started',
      };

      // Handle Lead context
      if (leadId) {
        payload.relatedTo = leadId;
        payload.onModel = 'Lead';
      }

      // Handle default/explicit values override
      if (defaultValues) {
        if (defaultValues.assignedTo) payload.assignedToId = defaultValues.assignedTo;
        if (defaultValues.relatedTo) payload.relatedTo = defaultValues.relatedTo;
        if (defaultValues.onModel) payload.onModel = defaultValues.onModel;
      }

      await createFollowUp(payload);

      toast.success('Follow-up scheduled successfully');
      onSuccess();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Follow-up creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to schedule follow-up';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Schedule Follow-up</DialogTitle>
          <DialogDescription>Set a reminder for your next interaction.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Follow up..."
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details about the follow-up..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Due Date & Time</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Follow-up
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
