import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Bell, Smartphone } from 'lucide-react';
import { playNotificationSound, triggerRichNotification } from '@/utils/notificationFeedback';
import { triggerAndroidNotification } from '@/utils/androidBridge';
import { toast } from 'sonner';

export const NotificationTest: React.FC = () => {
  const testLocalSound = () => {
    playNotificationSound();
    toast.info("Triggered Local Sound", { description: "Check your computer speakers." });
  };

  const testRichNotification = () => {
    triggerRichNotification("Test Title", "This is a test notification message.");
    toast.info("Triggered Rich Notification", { description: "Sound and OS popup should trigger." });
  };

  const testAndroidNotification = () => {
    triggerAndroidNotification("Test Mobile", "Mobile test alert triggered.");
    toast.info("Triggered Android Bridge", { description: "If on mobile, native chime should play." });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-600" />
          Notification Diagnostic
        </CardTitle>
        <CardDescription className="text-xs">
          Use these tests to verify sound and vibration feedback.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={testLocalSound} className="text-xs">
          <Play className="h-3 w-3 mr-1" /> Test PC Sound
        </Button>
        <Button variant="outline" size="sm" onClick={testRichNotification} className="text-xs">
          <Bell className="h-3 w-3 mr-1" /> Test Rich Alert
        </Button>
        <Button variant="outline" size="sm" onClick={testAndroidNotification} className="text-xs">
          <Smartphone className="h-3 w-3 mr-1" /> Test Mobile Bridge
        </Button>
      </CardContent>
    </Card>
  );
};
