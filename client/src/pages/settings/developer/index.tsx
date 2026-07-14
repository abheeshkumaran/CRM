import { copyToClipboard } from "@/lib/utils";
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Copy, Plus, Trash2, Globe, Key, AlertCircle, Loader2, FileText, Check, Code } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  deleteWebhook
} from "@/services/developerService"

export default function DeveloperSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get("tab") || "api-keys"

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Developer Settings</h1>
              <p className="text-gray-500">Manage API keys and webhooks for integrations.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="api-keys" className="flex items-center gap-2"><Key className="w-4 h-4" /> API Keys</TabsTrigger>
                <TabsTrigger value="webhooks" className="flex items-center gap-2"><Globe className="w-4 h-4" /> Webhooks</TabsTrigger>
                <TabsTrigger value="docs" className="flex items-center gap-2"><FileText className="w-4 h-4" /> API Documentation</TabsTrigger>
              </TabsList>

              <TabsContent value="api-keys" className="space-y-4">
                <ApiKeysTab />
              </TabsContent>

              <TabsContent value="webhooks" className="space-y-4">
                <WebhooksTab />
              </TabsContent>

              <TabsContent value="docs" className="space-y-4">
                <DocsTab />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

function ApiKeysTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<{ key: string, name: string } | null>(null)

  const queryClient = useQueryClient()

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: getApiKeys
  })
  const apiKeys = apiKeysData?.apiKeys || []

  const createMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setCreatedKey({ key: data.apiKey.key, name: data.apiKey.name })
      setNewKeyName("")
      // Don't close dialog yet, showing the key
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message || "Failed to create key")
  })

  const revokeMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success("API Key revoked")
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      toast.success("API Key deleted")
    }
  })

  const handleCreate = () => {
    if (!newKeyName.trim()) return
    createMutation.mutate({ name: newKeyName })
  }

  const handleCloseCreate = () => {
    setIsCreateOpen(false)
    setCreatedKey(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Manage keys used to access the API.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Generate New Key</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>Create a new key to access the API.</DialogDescription>
            </DialogHeader>

            {!createdKey ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input
                    placeholder="e.g. Website Integration"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-900 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-300">Save this key now</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">This secret key will essentially disappear forever if you don't copy it now.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input value={createdKey.key} readOnly className="font-mono" />
                  <Button size="icon" variant="outline" onClick={() => {
                    copyToClipboard(createdKey.key)
                    toast.success("Key copied to clipboard")
                  }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              {!createdKey ? (
                <Button onClick={handleCreate} disabled={createMutation.isPending || !newKeyName.trim()}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Key
                </Button>
              ) : (
                <Button onClick={handleCloseCreate}>Done</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <div>Loading...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>First 8 Chars</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-gray-500">No API keys found.</TableCell>
                </TableRow>
              ) : apiKeys.map((key: { id: string, name: string, isActive: boolean, createdAt: string, firstEight: string }) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    {key.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Revoked</Badge>
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(key.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[100px] truncate">{key.firstEight}...</TableCell>
                  <TableCell className="text-right">
                    {key.isActive && (
                      <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50" onClick={() => revokeMutation.mutate(key.id)}>
                        Revoke
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate(key.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function WebhooksTab() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [url, setUrl] = useState("")

  const queryClient = useQueryClient()

  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: getWebhooks
  })
  const webhooks = webhooksData?.webhooks || []

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success("Webhook created")
      setIsCreateOpen(false)
      setUrl("")
    },
    onError: (error: { response?: { data?: { message?: string } } }) => toast.error(error.response?.data?.message || "Failed to create webhook")
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast.success("Webhook deleted")
    }
  })

  const handleCreate = () => {
    if (!url.trim()) return
    // Default to all basic lead events for now
    createMutation.mutate({ url, events: ['lead.created', 'lead.updated'] })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>Send data to external URLs when events occur.</CardDescription>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Add Webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Webhook</DialogTitle>
              <DialogDescription>Define a URL to receive event payloads.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Endpoint URL</Label>
                <Input
                  placeholder="https://api.example.com/webhook"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Events</Label>
                <div className="flex gap-2 text-sm text-gray-500">
                  <Badge variant="secondary">lead.created</Badge>
                  <Badge variant="secondary">lead.updated</Badge>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={createMutation.isPending || !url.trim()}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <div>Loading...</div> : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-gray-500">No webhooks configured.</TableCell>
                </TableRow>
              ) : webhooks.map((hook: { id: string, url: string, events: string[] }) => (
                <TableRow key={hook.id}>
                  <TableCell className="font-mono text-sm">{hook.url}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {hook.events.map((e: string) => (
                        <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate(hook.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
function DocsTab() {
  const baseUrl = window.location.origin.replace(':5173', ':5000') // Adjust for dev/prod
  const apiEndpoint = `${baseUrl}/api/v1/leads`

  const curlExample = `curl -X POST ${apiEndpoint} \\
 -H "Content-Type: application/json" \\
 -H "X-API-KEY: YOUR_API_KEY" \\
 -d '{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "company": "Acme Inc",
  "message": "Interested in your services",
  "source": "website",
  "branchId": "OPTIONAL_BRANCH_ID",
  "assignedToId": "OPTIONAL_USER_ID"
 }'`

  const jsExample = `fetch("${apiEndpoint}", {
 method: "POST",
 headers: {
  "Content-Type": "application/json",
  "X-API-KEY": "YOUR_API_KEY"
 },
 body: JSON.stringify({
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  phone: "9876543210",
  company: "Acme Inc",
  message: "Interested in your services",
  source: "website"
 })
})
.then(response => response.json())
.then(() => toast.success("Test event sent"))
.catch(error => console.error("Error:", error));`

  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
    toast.success("Copied to clipboard")
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code className="w-5 h-5 text-blue-500" /> Website Integration (Inbound Leads)</CardTitle>
          <CardDescription>Use this endpoint to push leads from your website forms directly into the CRM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input value={apiEndpoint} readOnly className="bg-gray-50 font-mono text-sm" />
              <Button size="icon" variant="outline" onClick={() => handleCopy(apiEndpoint, 'url')}>
                {copied === 'url' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>cURL Example</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(curlExample, 'curl')}>
                  {copied === 'curl' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy
                </Button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono">
                {curlExample}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>JavaScript (Fetch) Example</Label>
                <Button variant="ghost" size="sm" onClick={() => handleCopy(jsExample, 'js')}>
                  {copied === 'js' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  Copy
                </Button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-xs font-mono">
                {jsExample}
              </pre>
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2 mb-1 text-sm">
              <AlertCircle className="w-4 h-4" /> Important Notes
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-400 list-disc list-inside space-y-1">
              <li>Replace <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">YOUR_API_KEY</code> with a key from the API Keys tab.</li>
              <li>Requests must include the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">X-API-KEY</code> header.</li>
              <li>The CRM will automatically perform duplicate checks and trigger workflows.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
          <CardDescription>The following fields are accepted by the Leads API.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-sm">firstName</TableCell>
                <TableCell>string</TableCell>
                <TableCell>First name of the lead (Required)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">lastName</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Last name of the lead</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">email</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Email address (Required if no phone)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">phone</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Phone number (Required if no email)</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">company</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Company name</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">message</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Message or inquiry content</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">source</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Source label (e.g., "website", "landing_page")</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">branchId</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Optional ID of the branch to assign this lead to.</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-mono text-sm">assignedToId</TableCell>
                <TableCell>string</TableCell>
                <TableCell>Optional ID of the specific user to assign this lead to.</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
