import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Phone, Settings, Bell, HardDrive, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCallSettings, updateCallSettings, type CallSettings } from '@/services/callSettingsService';

const defaultSettings: Partial<CallSettings> = {
  autoRecordOutbound: false,
  autoRecordInbound: false,
  recordingQuality: 'high',
  storageType: 'local',
  retentionDays: 90,
  autoDeleteEnabled: false,
  popupOnIncoming: true,
  autoFollowupReminder: true,
  followupDelayMinutes: 30
};

export default function CallRecordingSettingsPage() {
  const queryClient = useQueryClient();

  const [localOverrides, setLocalOverrides] = useState<Partial<CallSettings>>({});

  const { data: serverSettings, isLoading } = useQuery({
    queryKey: ['callSettings'],
    queryFn: getCallSettings
  });

  // Combine server settings with local overrides
  const settings = useMemo(() => ({
    ...defaultSettings,
    ...serverSettings,
    ...localOverrides
  }), [serverSettings, localOverrides]);


  const updateMutation = useMutation({
    mutationFn: updateCallSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['callSettings'] });
      toast.success('Call recording settings saved successfully');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  const handleToggle = (key: keyof CallSettings, value: boolean) => {
    setLocalOverrides(prev => ({ ...prev, [key]: value }));
  };

  const handleChange = (key: keyof CallSettings, value: string | number) => {
    setLocalOverrides(prev => ({ ...prev, [key]: value }));
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
                <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Call Recording Settings
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configure automatic call recording and storage options
                </p>
              </div>
            </div>

            {/* Recording Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Recording Options</CardTitle>
                    <CardDescription>Configure automatic call recording behavior</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRecordOutbound">Auto-record Outbound Calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically record all outgoing calls
                    </p>
                  </div>
                  <Switch
                    id="autoRecordOutbound"
                    checked={settings.autoRecordOutbound}
                    onCheckedChange={(checked) => handleToggle('autoRecordOutbound', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoRecordInbound">Auto-record Inbound Calls</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically record all incoming calls
                    </p>
                  </div>
                  <Switch
                    id="autoRecordInbound"
                    checked={settings.autoRecordInbound}
                    onCheckedChange={(checked) => handleToggle('autoRecordInbound', checked)}
                  />
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label htmlFor="recordingQuality">Recording Quality</Label>
                  <Select
                    value={settings.recordingQuality}
                    onValueChange={(value) => handleChange('recordingQuality', value)}
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (saves storage)</SelectItem>
                      <SelectItem value="medium">Medium (balanced)</SelectItem>
                      <SelectItem value="high">High (best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Higher quality uses more storage space
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Storage Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Storage & Retention</CardTitle>
                    <CardDescription>Manage recording storage and retention policies</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="storageType">Storage Location</Label>
                  <Select
                    value={settings.storageType}
                    onValueChange={(value) => handleChange('storageType', value)}
                  >
                    <SelectTrigger className="w-full md:w-[250px]">
                      <SelectValue placeholder="Select storage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Server Storage</SelectItem>
                      <SelectItem value="cloud">Cloud Storage (S3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="grid gap-2">
                  <Label htmlFor="retentionDays">Retention Period (days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min={1}
                    max={365}
                    className="w-full md:w-[250px]"
                    value={settings.retentionDays}
                    onChange={(e) => handleChange('retentionDays', parseInt(e.target.value) || 90)}
                  />
                  <p className="text-sm text-muted-foreground">
                    How long to keep recordings before they can be auto-deleted
                  </p>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <Label htmlFor="autoDeleteEnabled">Auto-delete Old Recordings</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete recordings older than retention period
                    </p>
                  </div>
                  <Switch
                    id="autoDeleteEnabled"
                    checked={settings.autoDeleteEnabled}
                    onCheckedChange={(checked) => handleToggle('autoDeleteEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Synchronization */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Contact Synchronization</CardTitle>
                    <CardDescription>Control how the CRM handles unknown phone numbers</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="syncNonCrmContacts">Enable Unknown Number Sync</Label>
                    <p className="text-sm text-muted-foreground">
                      If enabled, all call data will be logged. If disabled, only calls from existing Leads or Contacts will be tracked.
                    </p>
                  </div>
                  <Switch
                    id="syncNonCrmContacts"
                    checked={settings.syncNonCrmContacts}
                    onCheckedChange={(checked) => handleToggle('syncNonCrmContacts', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notification Options */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Notifications & Follow-ups</CardTitle>
                    <CardDescription>Configure call notifications and automatic reminders</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="popupOnIncoming">Incoming Call Pop-up</Label>
                    <p className="text-sm text-muted-foreground">
                      Show lead/contact details when receiving calls
                    </p>
                  </div>
                  <Switch
                    id="popupOnIncoming"
                    checked={settings.popupOnIncoming}
                    onCheckedChange={(checked) => handleToggle('popupOnIncoming', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoFollowupReminder">Auto Follow-up Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Create automatic follow-up tasks after calls
                    </p>
                  </div>
                  <Switch
                    id="autoFollowupReminder"
                    checked={settings.autoFollowupReminder}
                    onCheckedChange={(checked) => handleToggle('autoFollowupReminder', checked)}
                  />
                </div>

                {settings.autoFollowupReminder && (
                  <>
                    <Separator />
                    <div className="grid gap-2">
                      <Label htmlFor="followupDelayMinutes">Follow-up Delay (minutes)</Label>
                      <Input
                        id="followupDelayMinutes"
                        type="number"
                        min={5}
                        max={1440}
                        className="w-full md:w-[250px]"
                        value={settings.followupDelayMinutes}
                        onChange={(e) => handleChange('followupDelayMinutes', parseInt(e.target.value) || 30)}
                      />
                      <p className="text-sm text-muted-foreground">
                        Time after call ends to trigger follow-up reminder
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Link to="/settings">
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
              >
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Settings className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
