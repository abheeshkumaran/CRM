import { useState, useEffect } from 'react';
import type { CreateTaskData } from '@/services/taskService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { Loader2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string; // Optional: Keep for backward compat
  defaultValues?: {
    assignedTo?: string;
    relatedTo?: string;
    onModel?: string;
  };
  onSuccess: () => void;
}

interface BasicUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function CreateTaskDialog({ open, onOpenChange, leadId, defaultValues, onSuccess }: CreateTaskDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<BasicUser[]>([]);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [subordinatesOnly, setSubordinatesOnly] = useState(false);

  // Form States
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSubject('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      
      // Set default assignee if provided, otherwise it stays empty (defaults to self in backend if not provided)
      setAssignedTo(defaultValues?.assignedTo || '');
      
      fetchReachableUsers(subordinatesOnly);
    }
  }, [open, defaultValues, subordinatesOnly]);

  const fetchReachableUsers = async (onlySubordinates: boolean = false) => {
    setFetchingUsers(true);
    try {
      const { data } = await api.get(`/users?subordinatesOnly=${onlySubordinates}`);
      if (data.users) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch reachable users:', error);
    } finally {
      setFetchingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload: CreateTaskData = {
        subject,
        description,
        priority,
        dueDate,
        status: 'not_started',
      };

      // Use state-controlled assignedTo if selected
      if (assignedTo) {
        payload.assignedTo = assignedTo;
      } else if (defaultValues?.assignedTo) {
        payload.assignedTo = defaultValues.assignedTo;
      }

      // Handle Lead context (backward compatibility)
      if (leadId) {
        payload.relatedTo = leadId;
        payload.onModel = 'Lead';
      }

      // Handle default/explicit values override
      if (defaultValues) {
        if (defaultValues.relatedTo) payload.relatedTo = defaultValues.relatedTo;
        if (defaultValues.onModel) payload.onModel = defaultValues.onModel;
      }

      await api.post('/tasks', payload);

      toast.success('Task created successfully');
      onSuccess();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Task creation error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create task';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task and assign it to a team member.</DialogDescription>
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
              placeholder="Details about the task..."
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="assignedTo">Assign To</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="subordinates-only" 
                  checked={subordinatesOnly} 
                  onCheckedChange={setSubordinatesOnly} 
                />
                <Label htmlFor="subordinates-only" className="text-xs font-normal text-muted-foreground">Subordinates only</Label>
              </div>
            </div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="assignedTo">
                <SelectValue placeholder={fetchingUsers ? "Loading users..." : "Assign to self (default)"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self-placeholder-none">Assign to self (default)</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3 text-muted-foreground" />
                      {user.firstName} {user.lastName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
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
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

