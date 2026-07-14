import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, FileText, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { CalendarEvent } from '@/services/eventService';

interface EventDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (eventId: string) => void;
}

const typeColors: Record<string, string> = {
  meeting: 'bg-blue-500',
  call: 'bg-green-500',
  task: 'bg-orange-500',
  demo: 'bg-purple-500',
  follow_up: 'bg-pink-500',
  reminder: 'bg-yellow-500'
};

export function EventDetailsDialog({ event, open, onOpenChange, onDelete }: EventDetailsDialogProps) {
  if (!event) return null;

  const startDate = new Date(event.startTime);
  const endDate = new Date(event.endTime);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge className={`${typeColors[event.type]} text-white`}>
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Badge>
            <DialogTitle className="text-xl">{event.title}</DialogTitle>
          </div>
          <DialogDescription>View event details and information</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
              </p>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <p>{event.location}</p>
            </div>
          )}

          {/* Lead */}
          {event.lead && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <p>Lead: {event.lead.firstName} {event.lead.lastName}</p>
            </div>
          )}

          {/* Contact */}
          {event.contact && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <p>Contact: {event.contact.firstName} {event.contact.lastName}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Notes</p>
                <p className="text-sm">{event.description}</p>
              </div>
            </div>
          )}

          {/* Status */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <Badge variant={event.status === 'completed' ? 'default' : 'secondary'}>
              {event.status}
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onDelete(event.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
