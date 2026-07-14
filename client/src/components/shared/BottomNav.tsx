import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, Users, CalendarCheck, Search, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { unlockAudio } from '@/utils/notificationFeedback';

const navItems = [
  { icon: LayoutGrid, label: 'Home', path: '/dashboard' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: Search, label: 'Search', path: '#search', isAction: true },
  { icon: CalendarCheck, label: 'Follow Ups', path: '/leads?view=today-followups' },
  { icon: MoreHorizontal, label: 'Menu', path: '#menu', isAction: true },
];

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const location = useLocation();

  const handleAction = (item: typeof navItems[0]) => {
    unlockAudio();
    if (item.label === 'Menu') {
      onMenuClick();
    } else if (item.label === 'Search') {
      // Trigger global search shortcut
      const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
      document.dispatchEvent(event);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border lg:hidden safe-bottom shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          
          if (item.isAction) {
            return (
              <button
                key={item.label}
                onClick={() => handleAction(item)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 group transition-all"
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-300 group-active:scale-90",
                  item.label === 'Search' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground"
                )}>
                  <item.icon className={cn("h-5 w-5", item.label === 'Search' ? "h-6 w-6" : "")} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/80">{item.label}</span>
              </button>
            );
          }

          return (
            <a
              key={item.label}
 href={item.path}
              onClick={unlockAudio}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 group transition-all"
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300 group-active:scale-90",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="h-5 w-5" />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tighter transition-colors",
                isActive ? "text-primary" : "text-muted-foreground/80"
              )}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
