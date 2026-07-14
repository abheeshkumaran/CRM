import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/services/api';
import { Loader2, Upload, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { socketService } from '@/services/socketService';
import { isMobileApp, initiateCall, onCallCompleted } from '@/utils/mobileBridge';
import { useQuery } from '@tanstack/react-query';
import { getCallSettings } from '@/services/callSettingsService';
import { Checkbox } from '@/components/ui/checkbox';

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
  leadPhone?: string;
  onSuccess: () => void;
}

export function LogCallDialog({ open, onOpenChange, leadId, leadPhone, onSuccess }: LogCallDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // Form States
  const [duration, setDuration] = useState('');
  const [status, setStatus] = useState('completed');
  const [notes, setNotes] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(leadPhone || '');
  const [waitingForDevice, setWaitingForDevice] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [createFollowUp, setCreateFollowUp] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['callSettings'],
    queryFn: getCallSettings
  });

  useEffect(() => {
    if (settings?.autoFollowupReminder) {
      setCreateFollowUp(true);
    }
  }, [settings]);

  const phoneNumberRef = useRef(phoneNumber);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update ref when state changes
  useEffect(() => {
    phoneNumberRef.current = phoneNumber;
  }, [phoneNumber]);

  useEffect(() => {
    if (open) {
      const userInfoStr = localStorage.getItem('userInfo');
      if (userInfoStr) {
        try {
          const user = JSON.parse(userInfoStr);
          // Connect socket when dialog opens (or ensure connected)
          const userId = user.id || user._id;
          if (userId) {
            socketService.connect(userId);
          }
        } catch (e) {
          console.error('Failed to parse user info', e);
        }
      }

      // Listen for call completion from mobile (Socket)
      socketService.on<{ callId: string }>('call_completed', (data) => {
        if (data.callId && data.callId === currentCallId) {
          toast.success('Call recording received from device!');
          setWaitingForDevice(false);
          onSuccess();
          onOpenChange(false);
        }
      });

      // Listen for call completion from MobileBridge (Native Wrapper)
      const removeBridgeListener = onCallCompleted((data) => {
        // Data: { phoneNumber, duration, timestamp, status }
        const currentPhone = phoneNumberRef.current || '';
        const cleanCurrent = currentPhone.replace(/[^0-9]/g, '');
        const cleanDataPhone = (data.phoneNumber || '').replace(/[^0-9]/g, '');

        if (cleanDataPhone.includes(cleanCurrent) || cleanCurrent.includes(cleanDataPhone)) {
          // Check if duration is in seconds (native) vs minutes (form)
          const durationSeconds = Number(data.duration) || 0;
          setDuration((durationSeconds / 60).toFixed(2));

          setStatus(data.status || 'completed');
          toast.success(`Call completed: ${data.duration}s`);

          // Auto-submit if we have a callId from initiation
          // But we might need the user to confirm or add notes.
          // For now, let's just populate the form and stop waiting.
          setWaitingForDevice(false);
        }
      });

      return () => {
        socketService.off('call_completed');
        removeBridgeListener();
      };
    }

    return () => {
      socketService.off('call_completed');
    };
  }, [open, currentCallId, onOpenChange, onSuccess]);


  const handleDeviceCall = async () => {
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    // Generate a unique session ID for this call lifecycle
    const callSessionId = crypto.randomUUID();

    // Check if running in mobile app wrapper
    if (isMobileApp()) {
      setIsLoading(true);
      setWaitingForDevice(true);

      // Initiate call via Bridge
      initiateCall(phoneNumber, callSessionId);

      // Create it via API first so we have an ID for fuzzy/exact matching later
      try {
        const initiateRes = await api.post('/calls/initiate', {
          leadId,
          phoneNumber,
          direction: 'outbound',
          callSessionId
        });
        const callId = initiateRes.data.id;
        setCurrentCallId(callId);
        toast.info('Calling on device...');
      } catch (e) {
        console.error('Failed to initiate call record', e);
      }
      return;
    }

    // Check user session
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
      toast.error('User session not found');
      return;
    }

    let userId;
    try {
      const user = JSON.parse(userInfoStr);
      userId = user.id || user._id;
    } catch {
      toast.error('Invalid user session data');
      return;
    }

    if (!userId) {
      toast.error('User ID is missing');
      return;
    }

    setIsLoading(true);
    // Show waiting state immediately to give feedback
    setWaitingForDevice(true);

    try {
      // 1. Create the call record
      const initiateRes = await api.post('/calls/initiate', {
        leadId,
        phoneNumber,
        direction: 'outbound',
        callSessionId
      });
      const callId = initiateRes.data.id;
      setCurrentCallId(callId);

      // 2. Emit signal to mobile
      toast.info(`Sending call request to device...`);
      socketService.emit('dial_request', {
        userId,
        phoneNumber,
        callId,
        callSessionId
      });

    } catch (error: unknown) {
      console.error('Device call failure:', error);
      // Revert state if API failed
      setWaitingForDevice(false);
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to initiate device call';
      toast.error(msg);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Initiate Call Record
      const initiateRes = await api.post('/calls/initiate', {
        leadId,
        phoneNumber,
        direction: 'outbound'
      });

      const callId = initiateRes.data.id;

      // 2. Complete Call Record (Upload File + Update Details)
      const formData = new FormData();
      if (file) {
        formData.append('recording', file);
      }
      if (duration) {
        formData.append('duration', (parseFloat(duration) * 60).toString());
      }

      formData.append('status', status);
      formData.append('notes', notes);
      formData.append('scheduleFollowUp', String(createFollowUp));

      await api.post(`/calls/${callId}/complete`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Call logged successfully');
      onSuccess();
      onOpenChange(false);

      // Reset form
      setFile(null);
      setDuration('');
      setNotes('');
      setStatus('completed');

    } catch (error: unknown) {
      console.error(error);
      toast.error('Failed to log call');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader>
          <DialogTitle>Log or Make Call</DialogTitle>
          <DialogDescription>Record call details or initiate a new call</DialogDescription>
        </DialogHeader>

        {waitingForDevice ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></div>
              <Smartphone className="h-12 w-12 text-blue-600 relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="font-medium text-lg">Check your phone</h3>
              <p className="text-muted-foreground text-sm">Dialing {phoneNumber}...</p>
              <p className="text-xs text-muted-foreground mt-2">Recording will upload automatically when call ends</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setWaitingForDevice(false);
                setIsLoading(false);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 234..."
                  required
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mb-[2px] bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                onClick={handleDeviceCall}
                disabled={isLoading}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Call on Device
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or log manually</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (mins)</Label>
                <Input
                  id="duration"
                  type="number"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="5"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="missed">Missed</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Recording (Optional)</Label>
              <div
                className="border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <div className="text-sm text-center">
                    <p className="font-medium text-primary">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="text-red-500 h-auto p-0 mt-1"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload audio file</p>
                    <p className="text-xs text-muted-foreground mt-1">MP3, WAV, M4A, WEBM</p>
                  </>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  title="Upload call recording"
                  className="hidden"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFile(e.target.files[0]);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Discussed requirements..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="followUp"
                checked={createFollowUp}
                onCheckedChange={(checked) => setCreateFollowUp(checked as boolean)}
              />
              <Label htmlFor="followUp" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Schedule auto follow-up task
                {settings?.followupDelayMinutes && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (in {settings.followupDelayMinutes} mins)
                  </span>
                )}
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Call
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
