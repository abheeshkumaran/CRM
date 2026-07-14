import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { getDailyAchievement, acknowledgeDailyNotification } from '@/services/salesTargetService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Flag } from 'lucide-react';
import { api } from '@/services/api';

export function DailyBriefingDialog() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch Sales Target Data
  const { data: achievement, isLoading: isLoadingAchievement } = useQuery({
    queryKey: ['daily-achievement'],
    queryFn: getDailyAchievement,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch Pending Follow-ups Count
  const { data: pendingStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['pending-followups-count'],
    queryFn: async () => {
      const res = await api.get('/leads/pending-follow-ups');
      return res.data;
    }
  });

  const isLoading = isLoadingAchievement || isLoadingStats;

  useEffect(() => {
    // Logic to show once per day
    const lastSeen = localStorage.getItem('dailyBriefingLastSeen');
    const today = new Date().toISOString().split('T')[0];

    // Only show if loaded, not seen today, and has target
    if (!isLoading && lastSeen !== today && achievement?.hasTarget) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [achievement, isLoading]);

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('dailyBriefingLastSeen', today);
    setIsOpen(false);
    if (achievement?.showNotification) {
      acknowledgeDailyNotification();
    }
  };

  if (isLoading) return null; // Don't render anything while loading (prevents flash)
  if (!achievement?.hasTarget || !achievement.target) return null;

  const { target } = achievement;
  const isCompleted = target.achievementPercent >= 100;

  const getMessage = () => {
    if (isCompleted) return "🎉 Incredible! Target Smashed!";
    if (target.achievementPercent >= 75) return "🔥 You're crushing it! Finish strong.";
    return "☀️ Good Morning! Here's your daily focus.";
  };

  const getGradient = () => {
    if (isCompleted) return 'from-green-500 to-emerald-600';
    if (target.achievementPercent >= 75) return 'from-orange-500 to-red-500';
    return 'from-blue-600 to-indigo-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md overflow-hidden p-0 border-0 shadow-2xl">
        <DialogDescription className="sr-only">Daily briefing and overview of your sales targets and follow-ups.</DialogDescription>
        {/* Header */}
        <div className={`bg-gradient-to-r ${getGradient()} p-6 text-white`}>
          <DialogHeader>
            <DialogTitle className="text-white text-2xl flex items-center gap-2">
              {isCompleted ? <Trophy className="h-8 w-8" /> : <Calendar className="h-8 w-8 text-white/80" />}
              Daily Briefing
            </DialogTitle>
            <DialogDescription className="text-blue-100 text-base mt-2">
              {getMessage()}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6 bg-white dark:bg-slate-950">
          {/* Sales Target Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Sales Target</h4>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {target.daysRemaining} days left
              </span>
            </div>

            <div className="text-center py-2">
              <div className="text-4xl font-extrabold text-foreground">
                {target.achievementPercent}%
              </div>
              <p className="text-sm text-muted-foreground">of {target.period} goal</p>
            </div>
            <Progress value={Math.min(target.achievementPercent, 100)} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>₹{target.achievedValue.toLocaleString()}</span>
              <span>Goal: ₹{target.targetValue.toLocaleString()}</span>
            </div>
          </div>

          {/* Pending Follow-ups Feature */}
          {pendingStats && pendingStats.count > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                <Flag className="h-4 w-4 text-orange-500" />
                <span>Pending Follow-ups ({pendingStats.count})</span>
              </div>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                {pendingStats.leads?.map((lead: any) => (
                  <div key={lead.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors cursor-pointer" onClick={() => {
                    setIsOpen(false);
                    window.location.href = `/leads/${lead.id}`;
                  }}>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{lead.firstName} {lead.lastName || ''}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        {lead.nextFollowUp ? format(new Date(lead.nextFollowUp), 'h:mm a') : 'TBD'}
                      </span>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">View Detail →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button className="w-full bg-slate-900 text-white hover:bg-slate-800" onClick={handleClose}>
            Let's get to work
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
