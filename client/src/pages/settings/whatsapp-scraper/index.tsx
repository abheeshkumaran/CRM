import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, MessageSquare, Shield, ArrowLeft, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/services/api';

export default function WhatsAppScraperSettingsPage() {
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const res = await api.get('/organisation');
      return res.data.organisation;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await api.put('/organisation', { whatsAppScrapingEnabled: enabled });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      toast.success('WhatsApp Scraper settings updated');
    },
    onError: () => {
      toast.error('Failed to update settings');
    }
  });

  const handleToggle = (checked: boolean) => {
    updateMutation.mutate(checked);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Link to="/settings">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  WhatsApp Scraper
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic WhatsApp message synchronization from Android devices
                </p>
              </div>
            </div>

            {/* Main Settings */}
            <Card className="border-emerald-100 dark:border-emerald-900/30 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-600" />
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Android Sync Control</CardTitle>
                    <CardDescription>Enable or disable message scraping from the companion app</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/20">
                  <div className="space-y-1">
                    <Label htmlFor="whatsAppScrapingEnabled" className="text-base font-semibold">
                      Enable WhatsApp Scraping
                    </Label>
                    <p className="text-sm text-muted-foreground max-w-md">
                      When enabled, the Android application will capture and sync incoming/outgoing 
                      WhatsApp messages to the CRM for matched leads.
                    </p>
                  </div>
                  <Switch
                    id="whatsAppScrapingEnabled"
                    checked={org?.whatsAppScrapingEnabled || false}
                    onCheckedChange={handleToggle}
                    disabled={updateMutation.isPending}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border bg-card/50 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">Privacy Note</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scraping only affects messages with contacts already present in your CRM. 
                      Personal messages from unknown numbers are not synced by default.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card/50 space-y-2">
                    <div className="flex items-center gap-2 text-blue-600">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">Real-time Updates</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Messages appear instantly in the lead timeline and WhatsApp inbox once received 
                      by the Android device.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Status / Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Setup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
                  <li>Install the official **CRM Android App** on your device.</li>
                  <li>Login with your agent credentials.</li>
                  <li>Grant **Notification Access** and **Accessibility** permissions when prompted.</li>
                  <li>Ensure this toggle is **ON** to start receiving messages.</li>
                </ol>
                <div className="mt-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    <strong>Note:</strong> At least one Android device must be online and running the app 
                    to sync messages. Data and battery optimizations should be disabled for the app.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
