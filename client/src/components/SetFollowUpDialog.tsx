import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface SetFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentDate?: string | null;
  onSuccess?: () => void;
}

export function SetFollowUpDialog({ open, onOpenChange, leadId, currentDate, onSuccess }: SetFollowUpDialogProps) {
  const getInitialValues = () => {
    if (!currentDate) return { date: '', time: '09:00' };
    const d = new Date(currentDate);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`
    };
  };

  const initialValues = getInitialValues();
  const [date, setDate] = useState<string>(initialValues.date);
  const [time, setTime] = useState<string>(initialValues.time);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Combine date and time, treat as local
      let dateTime = null;
      if (date && time) {
        const [year, month, day] = date.split('-').map(Number);
        const [hours, mins] = time.split(':').map(Number);
        dateTime = new Date(year, month - 1, day, hours, mins).toISOString();
      }

      await api.put(`/leads/${leadId}`, {
        nextFollowUp: dateTime
      });
      toast.success('Next follow-up updated');
      onSuccess?.();
      onOpenChange(false);
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
          <DialogTitle>Set Next Follow-up</DialogTitle>
          <DialogDescription>Schedule when you'll follow up with this lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Date</Label>
            <Input
              id="followUpDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUpTime">Time</Label>
            <Input
              id="followUpTime"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Scheduled follow-ups will appear in your daily briefing and the lead timeline.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
