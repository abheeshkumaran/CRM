import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getEnvironmentInfo } from '@/utils/environmentChecker';

export function EnvironmentWarning() {
  const [show, setShow] = useState(() => {
    const info = getEnvironmentInfo();
    const dismissedInSession = sessionStorage.getItem('envWarningDismissed');
    return !!(info.isLocal && !dismissedInSession);
  });
  // Removed duplicate useEffect logic

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('envWarningDismissed', 'true');
  };

  const handleSwitchToProduction = () => {
    window.location.href = 'https://dad-frontend-psi.vercel.app';
  };

  if (!show) return null;

  return (
    <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">
            ⚠️ Local Development Mode
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            You're using a <strong>local database</strong>. Data added here will <strong>NOT sync</strong> with other PCs.
            For consistent data across all devices, switch to production.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSwitchToProduction}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Switch to Production
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDismiss}
              className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              Dismiss
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-amber-500 hover:text-amber-700 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
