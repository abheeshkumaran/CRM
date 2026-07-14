import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Building, Globe, MapPin, Pencil, User, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { EditAccountDialog } from "@/components/shared/EditAccountDialog"
import { UpsellDialog } from "@/components/UpsellDialog"
import { CreateOpportunityDialog } from "@/components/CreateOpportunityDialog"

export default function AccountDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isOpportunityOpen, setIsOpportunityOpen] = useState(false)
  const [isUpsellOpen, setIsUpsellOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: account, isLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: async () => (await api.get(`/accounts/${id}`)).data,
    enabled: !!id && id !== 'new' && id !== 'undefined'
  })

  if (id === 'new') return <div>Create Account (Placeholder)</div>
  if (id === 'undefined') return <div className="p-8">Invalid Account ID. Please go back and try again.</div>
  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>
  if (!account) return <div className="p-8">Account not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/accounts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {account.name}
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building className="h-4 w-4" /> {account.industry || 'No Industry'}
            {account.website && <><span className="mx-2">•</span> <Globe className="h-4 w-4" /> <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noreferrer" className="hover:underline">{account.website}</a></>}
          </div>
        </div>
        <div className="ml-auto">
          <Badge>{account.type || 'Customer'}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-gray-600">
                    {account.address?.street}<br />
                    {account.address?.city} {account.address?.state} {account.address?.zipCode}<br />
                    {account.address?.country}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> <span>Owner: {account.owner?.firstName} {account.owner?.lastName}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
            <CardContent>
              {account.contacts && account.contacts.length > 0 ? (
                <ul className="space-y-2">
                  {account.contacts.map((contact: { id: string; firstName: string; lastName: string; email: string }) => (
                    <li key={contact.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => navigate(`/contacts/${contact.id}`)}>
                      <span>{contact.firstName} {contact.lastName}</span>
                      <span className="text-sm text-muted-foreground">{contact.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No contacts associated.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Opportunities</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setIsOpportunityOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Opportunity
              </Button>
            </CardHeader>
            <CardContent>
              {account.opportunities && account.opportunities.length > 0 ? (
                <ul className="space-y-2">
                  {account.opportunities.map((opp: { id: string; name: string; stage: string }) => (
                    <li key={opp.id} className="flex justify-between items-center p-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => navigate(`/opportunities`)}>
                      <span>{opp.name}</span>
                      <Badge variant={opp.stage === 'closed_won' ? 'default' : 'secondary'}>{opp.stage}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No opportunities associated.</p>
              )}
            </CardContent>
          </Card>

          {/* Purchase History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Purchase History</CardTitle>
              <div className="flex items-center gap-4">
                <Button size="sm" variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200" onClick={() => setIsUpsellOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Finalize Sale / Upsell
                </Button>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-2">Total Purchase:</span>
                  <span className="font-bold text-lg text-green-600">
                    ₹{(account.accountProducts || []).reduce((acc: number, curr: any) => acc + (curr.price * curr.quantity), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {account.accountProducts && account.accountProducts.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Product</th>
                        <th className="p-2 font-medium">Date</th>
                        <th className="p-2 font-medium">Qty</th>
                        <th className="p-2 font-medium">Price</th>
                        <th className="p-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {account.accountProducts.map((asset: any) => (
                        <tr key={asset.id} className="hover:bg-muted/30">
                          <td className="p-2 font-medium">{asset.customName || asset.product?.name}</td>
                          <td className="p-2 text-muted-foreground">
                            {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-2">{asset.quantity}</td>
                          <td className="p-2">₹{asset.price?.toLocaleString()}</td>
                          <td className="p-2 text-right font-medium">
                            ₹{(asset.price * asset.quantity).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No purchase history recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EditAccountDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        account={account}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['account', id] })}
      />

      <CreateOpportunityDialog
        open={isOpportunityOpen}
        onOpenChange={setIsOpportunityOpen}
        defaultValues={{ accountId: id }}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['account', id] })}
      />

      <UpsellDialog
        open={isUpsellOpen}
        onOpenChange={setIsUpsellOpen}
        accountId={id as string}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['account', id] })}
      />
    </div>
  )
}
