import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { Bell, ArrowLeft, Loader2, Send, Laptop, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function OrgAdminBroadcastPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Both title and message are required.');
      return;
    }

    try {
      setIsSending(true);
      const res = await api.post('/notifications/broadcast', { title, message });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Broadcast announcement successfully sent!');
        setTitle('');
        setMessage('');
      } else {
        toast.error('Failed to send broadcast');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'An error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back Navigation and Title */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/settings')}
          className="group flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to Settings
        </button>
        <div className="flex items-center gap-3 mt-1">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Bell className="h-5 w-5 stroke-[1.5]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Broadcast Announcements</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Send a persistent popup modal announcement to all active members of your organisation.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form Panel */}
        <Card className="lg:col-span-3 bg-card border-border backdrop-blur-sm shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-5">
            <CardTitle className="text-base text-foreground font-semibold">Compose Announcement</CardTitle>
            <CardDescription className="text-xs">
              Fill out the announcement details below. The message will display immediately as a persistent pop-up modal on your users' screens.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSend} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Broadcast Title</label>
                <Input
                  placeholder="e.g. Q2 Sales Target Updates"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-background border-border text-foreground focus-visible:ring-primary focus-visible:border-primary rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">Announcement Message</label>
                <textarea
                  placeholder="Provide all essential details for this broadcast announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none min-h-[140px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSending || !title || !message}
                className={cn(
                  "w-full h-11 text-sm font-semibold tracking-wide text-white rounded-xl shadow-lg transition-all",
                  "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
                  "shadow-indigo-600/10 disabled:opacity-50 flex items-center justify-center gap-2"
                )}
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Broadcasting popup...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Broadcast to Organisation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Live Preview / Hints Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Preview Widget */}
          <Card className="bg-gradient-to-br from-indigo-950/20 to-slate-900/30 border-indigo-900/35 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xs uppercase tracking-wider text-indigo-400 font-bold">Real-time Pop-up Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center p-6 pt-0">
              <div className="h-12 w-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Bell className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h4 className="text-foreground font-bold text-base mb-2 line-clamp-1">
                {title || 'Announcement Title'}
              </h4>
              <p className="text-muted-foreground text-xs text-center line-clamp-4 leading-relaxed max-w-sm px-2">
                {message || 'The detailed message of your popup broadcast announcement will appear here exactly as your users will see it in their premium non-dismissible dialog.'}
              </p>
              <div className="mt-6 w-full max-w-[140px] h-8 bg-indigo-600/20 border border-indigo-500/30 rounded-lg flex items-center justify-center text-[11px] font-semibold text-indigo-300">
                Mark as Read
              </div>
            </CardContent>
          </Card>

          {/* Guidelines info card */}
          <Card className="bg-card border-border/80">
            <CardHeader className="pb-3">
              <div className="flex gap-2 items-center">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">Important Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2.5 leading-relaxed">
              <p>
                <strong>Un-dismissible Nature:</strong> Once published, this announcement is strictly un-dismissible and acts as an overlay on all screens.
              </p>
              <p>
                <strong>Recipient Action Required:</strong> Recipients must explicitly click <strong>"Mark as Read"</strong> to dismiss the broadcast modal.
              </p>
              <p>
                <strong>Target Audience:</strong> This broadcast will reach all active and non-deleted users belonging to your specific organisation.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
