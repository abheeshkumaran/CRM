import { useEffect } from 'react';
import { useSocket } from '@/contexts/useSocket';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { triggerAndroidNotification } from '@/utils/androidBridge';

interface ProductViewNotification {
  type: 'product_view';
  title: string;
  message: string;
  productId: string;
  productName: string;
  shareSlug: string;
  viewedAt: string;
  viewerName: string;
  lead?: {
    id: string;
    name: string;
    company?: string;
    phone?: string;
    email?: string;
  };
  timestamp: number;
}

export const useProductViewNotifications = () => {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected) return;

    const handleProductView = (notification: ProductViewNotification) => {
      console.log('[Real-time] Product view notification received:', notification);

      // Show toast notification with rich content
      toast.success(notification.title, {
        description: notification.message,
        duration: 8000,
        icon: <Bell className="h-5 w-5" />,
        action: notification.lead ? {
          label: 'View Lead',
          onClick: () => {
            window.location.href = `/leads/${notification.lead?.id}`;
          }
        } : undefined,
        className: 'product-view-toast',
      });

      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (e) {
        // Ignore audio errors
      }

      // Update notification badge count (if you have one)
      window.dispatchEvent(new CustomEvent('new-notification', { 
        detail: notification 
      }));

      // Trigger native Android notification
      triggerAndroidNotification(notification.title, notification.message);
    };

    // Listen for product view notifications
    socket.on('product_view_notification', handleProductView);

    // console.log('[Real-time] Listening for product view notifications');

    // Cleanup
    return () => {
      socket.off('product_view_notification', handleProductView);
    };
  }, [socket, connected]);
};
