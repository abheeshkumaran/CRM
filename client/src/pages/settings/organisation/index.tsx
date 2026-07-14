import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
// ... rest of imports
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { setGlobalCurrency } from "@/lib/utils"
import { useCurrency } from "@/contexts/CurrencyContext"

interface UpsellConfig {
  itemLabel?: string;
  quantityLabel?: string;
  priceLabel?: string;
}

export default function OrganisationSettingsPage() {
  const queryClient = useQueryClient()
  const { setCurrency } = useCurrency()

  const { data: org, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: async () => {
      const res = await api.get('/organisation')
      return res.data.organisation
    }
  })
  
  const [emailEnabled, setEmailEnabled] = useState(false)

  useEffect(() => {
    if (org?.dailyReportEmailEnabled !== undefined) {
      setEmailEnabled(org.dailyReportEmailEnabled)
    }
  }, [org])

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.put('/organisation', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] })
      toast.success('Organisation updated successfully')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update organisation')
    }
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    updateMutation.mutate({
      name: formData.get('name'),
      contactEmail: formData.get('contactEmail'),
      contactPhone: formData.get('contactPhone'),
      address: formData.get('address'),
      dailyReportTime: formData.get('dailyReportTime'),
      dailyReportEmailEnabled: emailEnabled
    })
  }

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>

  return (
    <div className="space-y-6 container mx-auto p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Organisation Settings</h1>
          <p className="text-gray-500">Manage your company profile.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your organisation's details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organisation Name</Label>
                  <Input name="name" defaultValue={org?.name} required />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input value={org?.slug} disabled className="bg-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input name="contactEmail" type="email" defaultValue={org?.contactEmail} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input name="contactPhone" type="tel" defaultValue={org?.contactPhone} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input name="address" defaultValue={org?.address} placeholder="123 Business St, City, Country" />
                </div>
                <div className="space-y-4">
                   <div className="flex flex-col gap-2">
                      <Label>Daily Report Time</Label>
                      <Input name="dailyReportTime" type="time" defaultValue={org?.dailyReportTime || "09:00"} className="w-full" />
                      <p className="text-[10px] text-muted-foreground italic">This time applies to both WhatsApp and Email reports.</p>
                   </div>
                   
                   <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Email Report Delivery</Label>
                        <p className="text-xs text-muted-foreground">Automatically send this report to all Org Admins via email.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={emailEnabled} 
                          onCheckedChange={setEmailEnabled}
                        />
                      </div>
                   </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await api.post('/organisation/send-test-report')
                      toast.success('Test report sent successfully')
                    } catch (err: unknown) {
                      const error = err as { response?: { data?: { message?: string } } };
                      toast.error(error.response?.data?.message || 'Failed to send test report')
                    }
                  }}
                >
                  Send Daily Report Now
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upsell Calculator Settings</CardTitle>
            <CardDescription>Configure labels for the revenue calculator (e.g., "Students", "Tuition").</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              // Combine existing profile update logic or separating it? 
              // For simplicity, let's keep one update function but we need to merge data carefully or just send what's changed.
              // The current implementation sends specific fields. Let's update it to send everything.

              const upsellConfig = {
                itemLabel: formData.get('itemLabel'),
                quantityLabel: formData.get('quantityLabel'),
                priceLabel: formData.get('priceLabel')
              }

              updateMutation.mutate({
                upsellConfig
              })
            }} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Item Label (Default: Item)</Label>
                  <Input name="itemLabel" defaultValue={(org?.upsellConfig as UpsellConfig)?.itemLabel || 'Item'} placeholder="e.g. Service, Product" />
                </div>
                <div className="space-y-2">
                  <Label>Quantity Label (Default: Quantity)</Label>
                  <Input name="quantityLabel" defaultValue={(org?.upsellConfig as UpsellConfig)?.quantityLabel || 'Quantity'} placeholder="e.g. Students, Hours" />
                </div>
                <div className="space-y-2">
                  <Label>Price Label (Default: Price)</Label>
                  <Input name="priceLabel" defaultValue={(org?.upsellConfig as UpsellConfig)?.priceLabel || 'Price'} placeholder="e.g. Tuition Fee, Rate" />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>Save Settings</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currency Settings</CardTitle>
            <CardDescription>Set the default currency for the application (e.g., USD, INR, EUR).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              const currency = formData.get('currency') as string

              updateMutation.mutate({ currency }, {
                onSuccess: () => {
                  // Update global currency immediately
                  setCurrency(currency);
                  setGlobalCurrency(currency);

                  // Update localStorage to persist across reloads
                  const userInfo = localStorage.getItem('userInfo');
                  if (userInfo) {
                    const parsed = JSON.parse(userInfo);
                    if (parsed.organisation) {
                      parsed.organisation.currency = currency;
                      localStorage.setItem('userInfo', JSON.stringify(parsed));
                    }
                  }
                }
              })
            }} className="space-y-4">
              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select name="currency" defaultValue={org?.currency || 'INR'}>
                  <SelectTrigger className="w-[280px]">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="SGD">SGD ($)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>Save Currency</Button>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
