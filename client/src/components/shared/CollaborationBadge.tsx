import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion, AnimatePresence } from 'framer-motion';

interface PresenceData {
  resourceId: string;
  action: 'join' | 'leave';
  userId: string;
  socketId: string;
}

interface UserPresence {
  userId: string;
  socketId: string;
}

export function CollaborationBadge({ resourceId }: { resourceId: string }) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!resourceId) return;

    // Join collaboration room
    socketService.emit('join_collaboration', { resourceId });

    const handlePresence = (data: PresenceData) => {
      if (data.resourceId !== resourceId) return;

      if (data.action === 'join') {
        setActiveUsers(prev => {
          if (prev.find(u => u.socketId === data.socketId)) return prev;
          return [...prev, { userId: data.userId, socketId: data.socketId }];
        });
      } else if (data.action === 'leave') {
        setActiveUsers(prev => prev.filter(u => u.socketId !== data.socketId));
      }
    };

    socketService.on<PresenceData>('presence_update', (data) => handlePresence(data));

    return () => {
      socketService.emit('leave_collaboration', { resourceId });
      socketService.off('presence_update');
    };
  }, [resourceId]);

  // Don't show if it's just the current user (this is a simple implementation)
  // In a real app, we'd filter out the current user's socketId

  return (
    <div className="flex -space-x-2 overflow-hidden items-center">
      <AnimatePresence>
        {activeUsers.map((user, idx) => (
          <motion.div
            key={user.socketId}
            initial={{ opacity: 0, scale: 0.5, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.5, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8 border-2 border-background ring-2 ring-primary/20 shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {idx + 1}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">User is viewing this page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        ))}
      </AnimatePresence>
      {activeUsers.length > 0 && (
        <span className="pl-4 text-xs font-medium text-primary animate-pulse">
          LIVE
        </span>
      )}
    </div>
  );
}
