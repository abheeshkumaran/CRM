
import { useState, useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { AxiosError } from "axios"
import { useQuery } from "@tanstack/react-query"
import { getAssignmentRules } from "@/services/assignmentRuleService"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { updateOrganisation, getOrganisation } from "@/services/settingsService"
import type { IntegrationSettings } from "@/services/settingsService"

interface IntegrationConfigDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  integrationType: 'meta' | 'slack' | 'twilio' | 'whatsapp' | 'sso' | 'happilee' | 'wabis' | 'doubletick' | 'googleads' | 'wati' | 'halapi' | 'gallabox' | 'zapier'
  initialValues?: Partial<IntegrationSettings>
}

export function IntegrationConfigDialog({ children, open, onOpenChange, integrationType, initialValues }: IntegrationConfigDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  const queryClient = useQueryClient()

  const form = useForm<IntegrationSettings>({
    defaultValues: {
      connected: false,
      ...initialValues
    }
  })

  // Watch connected state safely
  const isConnected = useWatch({
    control: form.control,
    name: 'connected'
  })

  const { data: rulesData } = useQuery({
    queryKey: ['assignment-rules', 'Lead'],
    queryFn: () => getAssignmentRules('Lead'),
    enabled: integrationType === 'meta' && isConnected
  })

  const { data: orgData } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation,
    enabled: integrationType === 'zapier'
  })

  const rules = Array.isArray(rulesData) ? rulesData : [];

  const formRules = useWatch({
    control: form.control,
    name: 'formRules' as any
  }) || {};

  const watchedApiKey = useWatch({
    control: form.control,
    name: 'apiKey'
  })

  const watchedConnectionMode = useWatch({
    control: form.control,
    name: 'connectionMode'
  })

  useEffect(() => {
    if (initialValues) {
      form.reset({
        connected: false,
        ...initialValues
      })
    }
  }, [initialValues, form])

  const mutation = useMutation({
    mutationFn: (data: IntegrationSettings) => {
      if (integrationType === 'sso') {
        // For SSO, we save to ssoConfig root field
        return updateOrganisation({ ssoConfig: data })
      }
      const updatePayload: { integrations: Record<string, IntegrationSettings> } = { integrations: {} }
      updatePayload.integrations[integrationType] = data
      return updateOrganisation(updatePayload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] })
      toast.success(`${integrationType.toUpperCase()} settings updated`)
      finalOnOpenChange?.(false)
    },
    onError: (error: AxiosError<{ message: string }>) => {
      toast.error(error.response?.data?.message || "Failed to update settings")
    },
  })

  function onSubmit(values: IntegrationSettings) {
    mutation.mutate(values)
  }

  const title = integrationType === 'meta'
    ? 'Meta Integration'
    : integrationType === 'slack'
      ? 'Slack Integration'
      : integrationType === 'twilio'
        ? 'Twilio Integration'
        : integrationType === 'whatsapp'
          ? 'WhatsApp Integration'
          : integrationType === 'happilee'
            ? 'Happilee Integration'
            : integrationType === 'wabis'
              ? 'Wabis Integration'
              : integrationType === 'doubletick'
                ? 'DoubleTick Integration'
                : integrationType === 'googleads'
                  ? 'Google Ads Integration'
                  : integrationType === 'wati'
                    ? 'Wati Integration'
                    : integrationType === 'halapi'
                      ? 'HAL API Integration'
                      : integrationType === 'gallabox'
                        ? 'Gallabox Integration'
                          : integrationType === 'zapier'
                            ? 'Zapier Integration'
                            : 'Single Sign-On (SAML)'

  const description = integrationType === 'meta'
    ? 'Connect your Facebook/Instagram account to sync leads.'
    : integrationType === 'slack'
      ? 'Connect Slack to receive notifications.'
      : integrationType === 'twilio'
        ? 'Connect Twilio account for cloud telephony.'
        : integrationType === 'whatsapp'
          ? 'Connect WhatsApp Business API.'
          : integrationType === 'happilee'
            ? 'Connect Happilee for WhatsApp automation.'
            : integrationType === 'wabis'
              ? 'Sync leads from Wabis.'
              : integrationType === 'doubletick'
                ? 'Integrate DoubleTick WhatsApp API.'
                : integrationType === 'googleads'
                  ? 'Sync Google Ads lead forms.'
                  : integrationType === 'wati'
                    ? 'Connect Wati for WhatsApp marketing.'
                    : integrationType === 'halapi'
                      ? 'Integrate HAL API for appointments.'
                      : integrationType === 'gallabox'
                        ? 'Connect Gallabox for WhatsApp lead sync.'
                          : integrationType === 'zapier'
                            ? 'Connect Facebook Lead Ads via Zapier webhook.'
                            : 'Configure SAML 2.0 Identity Provider (Okta, Azure AD, etc)'

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="connected"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Integration</FormLabel>
                    <FormDescription>
                      Turn on to activate.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Fields for SSO */}
            {integrationType === 'sso' && isConnected && (
              <>
                <FormField
                  control={form.control}
                  name="entryPoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IDP Entry Point (SSO URL)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://idp.example.com/sso/saml" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Login URL provided by your Identity Provider.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer (Entity ID)</FormLabel>
                      <FormControl>
                        <Input placeholder="mern-crm" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Audience URI / Entity ID configured in IDP. Default: mern-crm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cert"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Identity Provider Certificate</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <textarea
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="-----BEGIN CERTIFICATE-----..."
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs">
                        X.509 Certificate (PEM format) from your IDP.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Fields for Meta */}
            {integrationType === 'meta' && isConnected && (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs space-y-2">
                  <p className="font-semibold text-blue-800 dark:text-blue-300">💡 Pro Tip: Use a System User Token for a Permanent Connection</p>
                  <p className="text-blue-700 dark:text-blue-400">
                    Standard "Login with Facebook" tokens expire every 60 days. To avoid this, use a <strong>System User Token</strong>:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                    <li>Go to Meta Business Settings &gt; System Users</li>
                    <li>Generate a token for this App</li>
                    <li>Select <code>ads_management</code>, <code>ads_read</code>, and <code>leads_retrieval</code></li>
                  </ol>
                </div>

                <FormField
                  control={form.control}
                  name="pageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Facebook Page ID" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Paste your System User Token here" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-[10px]">
                        Paste a permanent System User Token or a User Access Token.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad Account ID</FormLabel>
                      <FormControl>
                        <Input placeholder="act_..." {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Meta Ad Account ID (starts with act_).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Fields for WhatsApp */}
            {integrationType === 'whatsapp' && isConnected && (
              <>
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter WhatsApp Access Token" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        System User Access Token from Meta Business.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number ID</FormLabel>
                      <FormControl>
                        <Input placeholder="WhatsApp Phone Number ID" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        From WhatsApp Business Platform &gt; API Setup.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="wabaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WABA ID</FormLabel>
                      <FormControl>
                        <Input placeholder="WhatsApp Business Account ID" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Required for templates and advanced features.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Meta App ID" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>App Secret (Optional)</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Meta App Secret" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="configId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Meta Configuration ID" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Required for WhatsApp Embedded Signup.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Fields for Meta - Updated to remove WhatsApp fields */}
            {integrationType === 'meta' && isConnected && (
              <>
                <FormField
                  control={form.control}
                  name="pageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Page ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Facebook Page ID" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="accessToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter User Access Token" {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Token from Meta Business Suite.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ad Account ID</FormLabel>
                      <FormControl>
                        <Input placeholder="act_..." {...field} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Meta Ad Account ID (starts with act_).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-sm font-medium">Assignment Logic</h4>

                  <FormField
                    control={form.control}
                    name="defaultRuleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Assignment Rule</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Manual (No auto-assignment)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Manual (Assign to Org Creator)</SelectItem>
                            {rules.map((rule: any) => (
                              <SelectItem key={rule.id} value={rule.id}>
                                {rule.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">
                          Rule used if no form-specific rule is found.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Form-Specific Rules</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const current = form.getValues('formRules' as any) || {};
                          form.setValue('formRules' as any, { ...current, '': '' });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Mapping
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(formRules).map(([formId, ruleId], index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              placeholder="Meta Form ID (e.g. 123456789)"
                              className="text-xs h-8"
                              value={formId}
                              onChange={(e) => {
                                const newFormId = e.target.value;
                                const current = { ...form.getValues('formRules' as any) };
                                const val = current[formId];
                                delete current[formId];
                                current[newFormId] = val;
                                form.setValue('formRules' as any, current);
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <Select
                              value={(ruleId as string) || "none"}
                              onValueChange={(val) => {
                                const current = { ...form.getValues('formRules' as any) };
                                current[formId] = val;
                                form.setValue('formRules' as any, current);
                              }}
                            >
                              <SelectTrigger className="text-xs h-8">
                                <SelectValue placeholder="Select Rule" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Default Rule</SelectItem>
                                {rules.map((rule: any) => (
                                  <SelectItem key={rule.id} value={rule.id}>
                                    {rule.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => {
                              const current = { ...form.getValues('formRules' as any) };
                              delete current[formId];
                              form.setValue('formRules' as any, current);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )
            }

            {/* Fields for Slack */}
            {
              integrationType === 'slack' && isConnected && (
                <>
                  <FormField
                    control={form.control}
                    name="channelId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Channel ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. C12345678" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accessToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bot Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="xoxb-..." {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )
            }

            {/* Fields for Twilio */}
            {
              integrationType === 'twilio' && isConnected && (
                <>
                  <FormField
                    control={form.control}
                    name="accountSid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account SID</FormLabel>
                        <FormControl>
                          <Input placeholder="AC..." {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auth Token</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" placeholder="Key..." {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Twilio Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Number to make calls from.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="forwardTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inbound Forwarding (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1987654321" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Redirect incoming calls to this real number.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )
            }

            {/* Fields for Happilee, Wabis, DoubleTick, Wati, HAL API, Gallabox */}
            {
              ['happilee', 'wabis', 'doubletick', 'wati', 'halapi', 'gallabox'].includes(integrationType) && isConnected && (
                <>
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" placeholder="Provider API Key" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {integrationType === 'gallabox' && (
                    <FormField
                      control={form.control}
                      name="apiSecret"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Secret</FormLabel>
                          <FormControl>
                            <Input type="password" autoComplete="new-password" placeholder="Gallabox API Secret" {...field} value={field.value as string || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {integrationType === 'gallabox' ? (
                    <>
                      <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Gallabox Account ID" {...field} value={field.value as string || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="channelId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Channel ID</FormLabel>
                            <FormControl>
                              <Input placeholder="Gallabox WhatsApp Channel ID" {...field} value={field.value as string || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  ) : (
                    <FormField
                      control={form.control}
                      name="endpoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endpoint URL (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://api.provider.com/v1" {...field} value={field.value as string || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )
            }


            {/* Specific Fields for Google Ads */}
            {
              integrationType === 'googleads' && isConnected && (
                <>
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer ID</FormLabel>
                        <FormControl>
                          <Input placeholder="123-456-7890" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Your Google Ads Customer ID.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Developer Token</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Developer Token" {...field} value={field.value as string || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )
            }

            {/* Fields for Zapier */}
            {integrationType === 'zapier' && isConnected && (
              <>
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="Enter a secure API key" {...field} value={field.value as string || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        A secret key to authenticate incoming Zapier webhooks.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-100 dark:border-orange-900/30">
                  <h4 className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2 uppercase">Zapier Webhook URL</h4>
                  <p className="text-xs text-orange-600/80 dark:text-orange-300/80 mb-2">
                    Use this URL as the <strong>Webhook URL</strong> in your Zapier action step (Webhooks by Zapier → POST).
                  </p>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Webhook URL (save first to generate)</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        className="h-7 text-xs bg-white dark:bg-black flex-1"
                        value={`${window.location.origin.replace('3000', '5001').replace('5173', '5000')}/api/public/zapier/webhook/${orgData?.id || '<ORG_ID>'}?apiKey=${form.getValues('apiKey') || '<YOUR_KEY>'}`}
                      />
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => {
                        const url = `${window.location.origin.replace('3000', '5001').replace('5173', '5000')}/api/public/zapier/webhook/${orgData?.id || ''}?apiKey=${form.getValues('apiKey') || ''}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Webhook URL Copied');
                      }}>Copy</Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            <DialogFooter className="flex justify-between sm:justify-between">
              {((integrationType === 'meta' && isConnected) || (integrationType === 'whatsapp' && isConnected)) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      if (integrationType === 'meta') {
                        const { testMetaConnection } = await import("@/services/adService");
                        const result = await testMetaConnection();
                        if (result.success) {
                          toast.success(`Connected to: ${result.accountName} (${result.status})`);
                        }
                      } else if (integrationType === 'whatsapp') {
                        const { testWhatsAppConnection } = await import("@/services/whatsAppService");
                        const result = await testWhatsAppConnection();
                        if (result.success) {
                          toast.success(`Connected to: ${result.verifiedName} (${result.phoneNumber})`);
                        }
                      }
                    } catch (err: unknown) {
                      const error = err as { message?: string; response?: { data?: { message?: string } } };
                      toast.error("Connection failed: " + (error.response?.data?.message || error.message));
                    }
                  }}
                >
                  Test Connection
                </Button>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form >
        </Form >
      </DialogContent >
    </Dialog >
  )
}
