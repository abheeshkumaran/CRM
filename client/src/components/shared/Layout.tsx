import { Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from './Header';
import { ViolationAlert } from "@/components/shared/ViolationAlert";
import { CommandCenter } from "@/components/shared/CommandCenter";
import { PersistentBroadcastModal } from './PersistentBroadcastModal';

import { socketService } from '@/services/socketService';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { useProductViewNotifications } from '@/hooks/useProductViewNotifications';
import { triggerAndroidNotification, triggerAndroidLeadSync } from '@/utils/androidBridge';
import { useQueryClient } from '@tanstack/react-query';
import { requestNotificationPermissions, triggerRichNotification, unlockAudio } from '@/utils/notificationFeedback';
import { BottomNav } from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const isDashboard = location.pathname === '/dashboard';
  const isFullWidthPage = location.pathname.startsWith('/automation/workflows') ||
    location.pathname.startsWith('/workflows') ||
    location.pathname.startsWith('/whatsapp') ||
    location.pathname.startsWith('/communications') ||
    location.pathname.startsWith('/opportunities');
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Enable real-time product view notifications
  useProductViewNotifications();

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // Close mobile menu when route changes
  useEffect(() => {
    // Defer to avoid cascading renders during navigation
    const timer = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const queryClient = useQueryClient();

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Request notification permissions on mount
    requestNotificationPermissions();

    // QUICK RESUME SYNC: Force refresh when app comes to foreground
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Layout] App resumed - forcing real-time sync...');
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        
        // Force socket to re-check connection
        socketService.reconnect();
        
        // Trigger native Android sync bridge if available
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          try {
            const { token } = JSON.parse(userInfo);
            if (token) triggerAndroidLeadSync(token);
          } catch (e) {
            console.error('Failed to parse userInfo for sync', e);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  useEffect(() => {
    interface CallUpdateData {
      status: 'connected' | 'ended';
      phoneNumber: string;
      duration?: string;
    }

    const handleCallUpdate = (data: CallUpdateData) => {
      if (data.status === 'connected') {
        toast.info(`Call Connected: ${data.phoneNumber}`, {
          description: 'Call timer started...',
          duration: Infinity,
          id: 'active-call-toast'
        });
      } else if (data.status === 'ended') {
        toast.dismiss('active-call-toast');
        toast.success(`Call Ended`, {
          description: `Duration: ${data.duration || 'Unknown'}`,
        });
      }
    };
    const handleRealtimeSync = (event: string) => {
      console.log(`[Socket] Real-time event received: ${event}`);
      if (event.startsWith('lead_')) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['lead'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      }
    };

    const handleNotification = (data: { title: string; message: string; type?: string }) => {
      if (!data) return; // Safeguard against null data

      // Invalidate notification queries to update the bell/popover
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // If it's a persistent popup, suppress the transient sonner toast to avoid duplicate alerts
      if (data.type === 'popup') {
        triggerRichNotification(data.title, data.message);
        triggerAndroidNotification(data.title, data.message);
        return;
      }

      // Map backend types to sonner toast types
      const type = data.type === 'error' ? 'error' :
        data.type === 'success' ? 'success' :
          data.type === 'warning' ? 'warning' : 'info';

      toast[type](data.title, {
        description: data.message,
        duration: 4000,
      });

      // Trigger sensory feedback (sound/vibration/OS popup)
      triggerRichNotification(data.title, data.message);

      // Native Android App push notification mirror
      triggerAndroidNotification(data.title, data.message);
    };

    socketService.on('call_status_update', handleCallUpdate);
    socketService.on('notification', handleNotification);

    // Real-time Data Sync Listeners
    socketService.on('lead_created', () => {
      handleRealtimeSync('lead_created');
      
      // Rich alert for new leads
      triggerRichNotification('New Lead Assigned', 'A fresh lead has been assigned to you. Details are available in the dashboard.');

      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const { token } = JSON.parse(userInfo);
        if (token) {
          triggerAndroidLeadSync(token);
          triggerAndroidNotification('CRM Alert', 'Lead activity detected.');
        }
      }
    });
    socketService.on('lead_updated', () => {
      handleRealtimeSync('lead_updated');
      
      // Rich alert for re-enquiries or updates
      triggerRichNotification('Lead Activity', 'A lead has been updated or a re-enquiry was received.');

      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const { token } = JSON.parse(userInfo);
        if (token) {
          triggerAndroidLeadSync(token);
          triggerAndroidNotification('CRM Alert', 'Lead activity detected.');
        }
      }
    });
    socketService.on('lead_deleted', () => handleRealtimeSync('lead_deleted'));

    // Initial sync on mount if on Android
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const { token } = JSON.parse(userInfo);
      if (token) triggerAndroidLeadSync(token);
    }

    return () => {
      socketService.off('call_status_update');
      socketService.off('notification');
      socketService.off('lead_created');
      socketService.off('lead_updated');
      socketService.off('lead_deleted');
    };
  }, []);

  // --- Scroll Restoration Logic ---
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const scrollKey = `scroll-pos-${location.pathname}${location.search}`;

    // 1. Restore scroll if it's a POP navigation (back button)
    if (navType === 'POP') {
      const savedScroll = sessionStorage.getItem(scrollKey);
      if (savedScroll) {
        const targetScroll = parseInt(savedScroll, 10);
        
        // Multiple attempts to restore scroll (handles slow-loading content/React Query)
        const restore = () => {
          if (main) main.scrollTop = targetScroll;
        };

        const timer1 = setTimeout(restore, 0);
        const timer2 = setTimeout(restore, 100);
        const timer3 = setTimeout(restore, 500); // Failsafe for slower data loads

        return () => {
          clearTimeout(timer1);
          clearTimeout(timer2);
          clearTimeout(timer3);
        };
      }
    } else {
      // 2. Reset scroll to top for PUSH navigation (new page)
      main.scrollTop = 0;
    }

    // 3. Save scroll position on scroll (throttled)
    let throttleTimer: any = null;
    const handleScroll = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        if (main && main.scrollTop > 0) {
          sessionStorage.setItem(scrollKey, main.scrollTop.toString());
        }
        throttleTimer = null;
      }, 150);
    };

    main.addEventListener('scroll', handleScroll);
    return () => {
      main.removeEventListener('scroll', handleScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [location.pathname, location.search, navType]);

  return (
    <div 
      className="flex h-screen overflow-hidden bg-background"
      onClick={unlockAudio}
      onTouchStart={unlockAudio}
    >
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <ErrorBoundary name="Sidebar">
          <Sidebar isCollapsed={collapsed} setIsCollapsed={setCollapsed} />
        </ErrorBoundary>
      </div>

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <ErrorBoundary name="MobileSidebar">
          <Sidebar isCollapsed={false} setIsCollapsed={() => { }} />
        </ErrorBoundary>
        {/* Close button inside sidebar for better UX */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-2 right-2 text-white/70 hover:text-white hover:bg-white/10 lg:hidden"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Standardized Header Container */}
        <div className="flex items-center gap-2 bg-card border-b border-border px-2 sm:px-4 h-16 shadow-md shadow-black/5 shrink-0 z-20 relative transition-all duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-10 w-10 text-primary hover:bg-primary/10 transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6 transform rotate-90 transition-transform duration-300" />
            ) : (
              <Menu className="h-6 w-6 transform rotate-0 transition-transform duration-300" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0 rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <ErrorBoundary name="Header">
            <Header className="flex-1 pl-2 sm:pl-4" />
          </ErrorBoundary>
        </div>

        <main 
          ref={mainRef as any}
          className={cn(
          "flex-1 bg-background/50 safe-bottom",
          isFullWidthPage ? "overflow-hidden flex flex-col" : "overflow-y-auto overflow-x-hidden scrollbar-thin"
        )}>
          <div className={cn(
            "w-full max-w-[2000px] mx-auto",
            isFullWidthPage ? "h-full" : "pb-24 lg:pb-8"
          )}>
            <div className={cn(
              isFullWidthPage ? "p-0 h-full" : "px-4 sm:px-6 pt-0 sm:pt-4"
            )}>
              <ErrorBoundary name="PageContent">
                <Outlet />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sticky Navigation */}
      <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />

      <ErrorBoundary name="ViolationAlert">
        <ViolationAlert />
      </ErrorBoundary>
      <ErrorBoundary name="CommandCenter">
        <CommandCenter />
      </ErrorBoundary>
      <ErrorBoundary name="PersistentBroadcastModal">
        <PersistentBroadcastModal />
      </ErrorBoundary>
    </div>
  );
}
