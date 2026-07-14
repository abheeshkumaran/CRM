import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotifications, markAsRead } from '@/services/notificationService';
import { socketService } from '@/services/socketService';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function PersistentBroadcastModal() {
  const queryClient = useQueryClient();
  const [currentNotifIndex, setCurrentNotifIndex] = useState(0);

  // Fetch unread popup notifications
  const { data, refetch } = useQuery({
    queryKey: ['unread-popup-notifications'],
    queryFn: async () => {
      try {
        const res = await getNotifications(1, 'popup', false);
        return res;
      } catch (err) {
        const status = (err as any).response?.status;
        if (status !== 401) {
          console.error('Error fetching popup notifications:', err);
        }
        return { notifications: [] };
      }
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });

  const notifications = data?.notifications || [];
  const currentNotif = notifications[currentNotifIndex];

  // Socket listener for real-time popups
  useEffect(() => {
    const handleNewNotification = (notif: any) => {
      if (notif && notif.type === 'popup') {
        refetch();
      }
    };

    socketService.on('notification', handleNewNotification);
    return () => {
      socketService.off('notification');
    };
  }, [refetch]);

  // Adjust index when notifications list updates
  useEffect(() => {
    if (currentNotifIndex >= notifications.length && notifications.length > 0) {
      setCurrentNotifIndex(notifications.length - 1);
    }
  }, [notifications.length, currentNotifIndex]);

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await markAsRead(id);
    },
    onSuccess: () => {
      // Invalidate queries to sync with Bell count and popups list
      queryClient.invalidateQueries({ queryKey: ['unread-popup-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      refetch();
    },
  });

  const handleMarkAsRead = () => {
    if (currentNotif) {
      markAsReadMutation.mutate(currentNotif.id);
    }
  };

  if (notifications.length === 0 || !currentNotif) {
    return null;
  }

  const isLast = currentNotifIndex === notifications.length - 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop overlay (non-dismissible) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Panel container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className={cn(
            "relative w-full max-w-lg overflow-hidden rounded-2xl border bg-slate-900/90 shadow-2xl backdrop-blur-xl",
            "border-slate-800 text-slate-100",
            "before:absolute before:inset-0 before:pointer-events-none before:rounded-2xl before:border before:border-white/5 before:bg-gradient-to-b before:from-white/10 before:to-transparent"
          )}
        >
          {/* Top glow border */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />

          {/* Modal Content */}
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            {/* Pulsing Animated Bell Icon */}
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400/20 opacity-75" />
              <Bell className="h-8 w-8 stroke-[1.5]" />
            </div>

            {/* Notification Badge / Index */}
            {notifications.length > 1 && (
              <div className="mb-3 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
                Notification {currentNotifIndex + 1} of {notifications.length}
              </div>
            )}

            {/* Title */}
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-3">
              {currentNotif.title}
            </h3>

            {/* Message Body (Markdown-like wrapper) */}
            <div className="text-sm sm:text-base text-slate-300 leading-relaxed max-h-60 overflow-y-auto mb-8 pr-2 w-full text-center scrollbar-thin">
              {currentNotif.message}
            </div>

            {/* Actions Panel */}
            <div className="flex w-full flex-col gap-3">
              <Button
                onClick={handleMarkAsRead}
                disabled={markAsReadMutation.isPending}
                className={cn(
                  "w-full h-12 text-sm font-semibold tracking-wide text-white rounded-xl shadow-lg transition-all duration-300",
                  "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500",
                  "shadow-indigo-600/20 hover:shadow-indigo-600/40",
                  "border border-indigo-500/30 flex items-center justify-center gap-2"
                )}
              >
                {markAsReadMutation.isPending ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Read
                  </>
                )}
              </Button>

              {/* Next/Carousel option if multiple notifications exist */}
              {notifications.length > 1 && !isLast && (
                <button
                  onClick={() => setCurrentNotifIndex(prev => prev + 1)}
                  className="text-xs font-medium text-slate-400 hover:text-indigo-400 flex items-center justify-center gap-1 transition-colors self-center py-2 cursor-pointer"
                >
                  Skip to next <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
