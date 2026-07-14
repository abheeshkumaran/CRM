import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getNotifications, markAsRead, markAllAsRead, type CRMNotification } from '@/services/notificationService'
import { formatDistanceToNow } from 'date-fns'
import { useSocket } from '@/contexts/useSocket'
import { toast } from '@/components/ui/use-toast'

export function NotificationPopover() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return

    const handleNotification = (notification: CRMNotification) => {
      // Invalidate query to refresh list
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      
      // Optional: Show toast if popover is closed
      if (!open) {
        toast({
          title: notification.title,
          description: notification.message,
        })
      }
    }

    socket.on('notification', handleNotification)

    return () => {
      socket.off('notification', handleNotification)
    }
  }, [socket, queryClient, open])

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(1),
    refetchInterval: 30000 // Poll every 30s
  })

  const notifications = Array.isArray(data?.notifications) ? data.notifications : []
  const unreadCount = data?.unreadCount || 0

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse border border-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-auto p-1 text-muted-foreground hover:text-primary"
              onClick={(e) => {
                e.preventDefault();
                markAllReadMutation.mutate();
              }}
            >
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif: CRMNotification) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                  onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
                >
                  <div className="flex gap-3 items-start">
                    <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary' : 'bg-transparent'}`} />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{notif.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-2 border-t text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary h-8"
            onClick={() => window.location.href = '/notifications'}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu >
  )
}
