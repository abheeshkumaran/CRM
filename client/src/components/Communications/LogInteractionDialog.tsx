import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getLeads } from "@/services/leadService";
import { getContacts } from "@/services/contactService";
import { createInteraction } from "@/services/interactionService";

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function LogInteractionDialog({ open, onOpenChange, onSuccess }: LogInteractionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [type, setType] = useState("call");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [duration, setDuration] = useState("");
  const [direction, setDirection] = useState("outbound");
  const [status, setStatus] = useState("completed");
  const [description, setDescription] = useState("");
  const [onModel, setOnModel] = useState<"Lead" | "Contact">("Lead");
  const [relatedTo, setRelatedTo] = useState("");

  // Entity Options
  const [entityOptions, setEntityOptions] = useState<{ id: string; name: string }[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // Fetch entities when model changes
  useEffect(() => {
    const fetchEntities = async () => {
      setIsLoadingEntities(true);
      try {
        let data: { id: string, firstName: string, lastName: string }[] = [];
        if (onModel === "Lead") {
          const response = await getLeads({ limit: 50, sortOrder: 'desc' });
          data = response.leads || [];
          setEntityOptions(data.map((l: { id: string, firstName: string, lastName: string }) => ({ id: l.id, name: `${l.firstName} ${l.lastName}` })));
        } else if (onModel === "Contact") {
          const response = await getContacts({ limit: 50, sortOrder: 'desc' });
          data = response.contacts || [];
          setEntityOptions(data.map((c: { id: string, firstName: string, lastName: string }) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
        }
      } catch (error) {
        console.error("Failed to fetch entities", error);
        toast.error(`Failed to load ${onModel}s`);
      } finally {
        setIsLoadingEntities(false);
      }
    };

    if (open) {
      fetchEntities();
    }
  }, [onModel, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!relatedTo) {
      toast.error("Please select who this interaction is related to");
      return;
    }

    setIsLoading(true);
    try {
      await createInteraction({
        subject,
        type: type as "call" | "email" | "meeting" | "note" | "sms" | "whatsapp" | "other",
        date: new Date(date).toISOString(),
        duration: duration ? parseInt(duration) : undefined,
        direction: direction as "inbound" | "outbound",
        status: status as "completed" | "planned" | "missed" | "cancelled",
        description,
        onModel,
        relatedTo,
      });

      toast.success("Interaction logged successfully");
      onSuccess();
      onOpenChange(false);

      // Reset form
      setSubject("");
      setDescription("");
      setRelatedTo("");
      setDuration("");
    } catch (err: unknown) {
      const error = err as { message?: string; response?: { data?: { message?: string } } };
      console.error("Error logging interaction:", error);
      toast.error(error.response?.data?.message || error.message || "Failed to log interaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
          <DialogDescription>
            Manually record a call, email, or meeting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Discussed pricing"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Related Entity</Label>
              <Select value={onModel} onValueChange={(val: "Lead" | "Contact") => { setOnModel(val); setRelatedTo(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Contact">Contact</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Select {onModel}</Label>
              <Select value={relatedTo} onValueChange={setRelatedTo}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingEntities ? "Loading..." : "Select..."} />
                </SelectTrigger>
                <SelectContent>
                  {entityOptions.map(opt => (
                    <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date & Time</Label>
              <Input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="15"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the interaction..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Interaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
