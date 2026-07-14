import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Building,
  Users,
  Target,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  UserCheck,
  Briefcase,
  FileText,
  Download,
  Receipt
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatCurrency } from '@/lib/utils'
import { AssignPlanDialog } from '@/components/super-admin/AssignPlanDialog'
import { EditOrganisationDialog } from '@/components/super-admin/EditOrganisationDialog'
import { SetCustomPriceDialog } from '@/components/super-admin/SetCustomPriceDialog'
import { useState } from 'react'

interface OrgDetails {
  organisation: {
    id: string
    name: string
    slug: string
    contactEmail?: string
    contactPhone?: string
    address?: string
    status: string
    userLimit: number
    currency: string
    subscription: {
      status: string
      startDate?: string
      endDate?: string
      plan?: { name: string; price: number }
    }
    createdAt: string
  }
  activeLicense?: {
    id: string
    status: string
    startDate: string
    endDate: string
    maxUsers: number
    customPrice?: number | null
    plan: {
      id: string
      name: string
      price: number
      pricingModel: 'flat_rate' | 'per_user'
      pricePerUser: number
      currency: string
      discount?: number
    }
  }
  users: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
    role: string
    position?: string
    userId?: string
    createdAt: string
  }>
  stats: {
    userCount: number
    leadCount: number
    contactCount: number
    accountCount: number
    opportunityCount: number
    totalRevenue: number
  }
}

export default function OrganisationDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isAssignPlanOpen, setIsAssignPlanOpen] = useState(false)
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false)
  const [isCustomPriceOpen, setIsCustomPriceOpen] = useState(false)

  const { data, isLoading, error } = useQuery<OrgDetails>({
    queryKey: ['organisation', id],
    queryFn: async () => {
      const userInfo = localStorage.getItem('userInfo')
      const token = userInfo ? JSON.parse(userInfo).token : null
      const res = await api.get(`/organisation/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      return res.data
    },
    enabled: !!id
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load organisation details</p>
        <Button variant="outline" onClick={() => navigate('/super-admin')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Super Admin
        </Button>
      </div>
    )
  }

  const { organisation: org, users, stats, activeLicense } = data

  const calculateBill = () => {
    if (!activeLicense || !activeLicense.plan) return { subtotal: 0, gst: 0, total: 0 };
    const plan = activeLicense.plan;
    
    let subtotal: number;
    
    // If custom price is set, multiply by user count (custom price is per user)
    if (activeLicense.customPrice !== null && activeLicense.customPrice !== undefined) {
      subtotal = activeLicense.customPrice * stats.userCount;
    } else {
      // Use standard plan pricing with discount
      const discount = plan.discount || 0;
      
      if (plan.pricingModel === 'flat_rate') {
        subtotal = plan.price;
      } else {
        subtotal = (plan.price || 0) + (plan.pricePerUser || 0) * stats.userCount;
      }
      
      // Apply discount only for standard pricing
      if (discount > 0) {
        subtotal = Math.round(subtotal * (1 - discount / 100));
      }
    }
    
    const gst = Math.round(subtotal * 0.18); // 18% GST
    const total = subtotal + gst;
    return { subtotal, gst, total };
  };

  const billAmounts = calculateBill();

  const daysRemaining = activeLicense ? Math.ceil((new Date(activeLicense.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin')} className="text-indigo-300 hover:text-white hover:bg-indigo-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{org.name}</h1>
              <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className={org.status === 'active' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}>
                {org.status}
              </Badge>
              <Badge variant={org.subscription?.status === 'active' ? 'default' : 'outline'} className={org.subscription?.status === 'active' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-indigo-300/70 border-indigo-700'}>
                {org.subscription?.status || 'No subscription'}
              </Badge>
            </div>
            <p className="text-indigo-300/70 mt-1">{org.slug}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-indigo-600 text-indigo-300 hover:bg-indigo-900/50"
          onClick={() => setIsEditOrgOpen(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Edit Details
        </Button>
      </div>

      {/* Billing Summary Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#1e1b4b] border-indigo-900/50 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Receipt className="h-16 w-16 text-indigo-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-300">Billing Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-baseline mb-4">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {formatCurrency(billAmounts.total, activeLicense?.plan.currency || 'INR')}
                </h3>
                <p className="text-xs text-indigo-400">Current Projected Bill (incl. GST)</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-indigo-700 text-indigo-300 hover:bg-indigo-900/40">
                    <FileText className="h-4 w-4 mr-2" /> Generate Bill
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0f172a] border-indigo-900 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-indigo-400" />
                      Invoice Summary - {org.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">Detailed breakdown of the organisation's billing and subscription.</DialogDescription>
                  </DialogHeader>
                  <div className="py-6 space-y-4">
                    <div className="flex justify-between border-b border-indigo-900/50 pb-2">
                      <span className="text-indigo-300">Organisation</span>
                      <span className="font-semibold">{org.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-900/50 pb-2">
                      <span className="text-indigo-300">Subscription Plan</span>
                      <span className="font-semibold text-indigo-400">{activeLicense?.plan.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-b border-indigo-900/50 pb-2">
                      <span className="text-indigo-300">Active Users</span>
                      <span className="font-semibold">{stats.userCount} users</span>
                    </div>

                    <div className="bg-indigo-950/30 p-4 rounded-lg space-y-2 mt-4">
                      {activeLicense?.customPrice !== null && activeLicense?.customPrice !== undefined ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-indigo-400">Standard Plan Price</span>
                            <span className="line-through text-indigo-500">
                              {formatCurrency(
                                activeLicense?.plan.pricingModel === 'flat_rate' 
                                  ? activeLicense?.plan.price 
                                  : (activeLicense?.plan.price || 0) + (activeLicense?.plan.pricePerUser || 0) * stats.userCount,
                                activeLicense?.plan.currency
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm text-amber-400 font-semibold">
                            <span>Custom Price Per User ({stats.userCount} × {formatCurrency(activeLicense.customPrice, activeLicense?.plan.currency)})</span>
                            <span>{formatCurrency(activeLicense.customPrice * stats.userCount, activeLicense?.plan.currency)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-indigo-400">Base Price ({activeLicense?.plan.pricingModel === 'flat_rate' ? 'Flat' : 'Base'})</span>
                            <span>{formatCurrency(activeLicense?.plan.price || 0, activeLicense?.plan.currency)}</span>
                          </div>
                          {activeLicense?.plan.pricingModel === 'per_user' && (
                            <div className="flex justify-between text-sm">
                              <span className="text-indigo-400">User Usage ({stats.userCount} x {formatCurrency(activeLicense?.plan.pricePerUser || 0, activeLicense?.plan.currency)})</span>
                              <span>{formatCurrency((activeLicense?.plan.pricePerUser || 0) * stats.userCount, activeLicense?.plan.currency)}</span>
                            </div>
                          )}
                          {(activeLicense?.plan.discount ?? 0) > 0 && (
                            <div className="flex justify-between text-sm text-green-400">
                              <span>Discount ({activeLicense?.plan.discount}%)</span>
                              <span>-{formatCurrency(
                                Math.round(((activeLicense?.plan.pricingModel === 'flat_rate' ? activeLicense?.plan.price : (activeLicense?.plan.price || 0) + (activeLicense?.plan.pricePerUser || 0) * stats.userCount) || 0) * ((activeLicense?.plan.discount || 0) / 100)),
                                activeLicense?.plan.currency
                              )}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t border-indigo-800">
                        <span className="text-indigo-400">Subtotal</span>
                        <span>{formatCurrency(billAmounts.subtotal, activeLicense?.plan.currency || 'INR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-indigo-400">GST (18%)</span>
                        <span>{formatCurrency(billAmounts.gst, activeLicense?.plan.currency || 'INR')}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-indigo-800 font-bold text-lg mt-2">
                        <span>Total Amount Due</span>
                        <span className="text-indigo-400">{formatCurrency(billAmounts.total, activeLicense?.plan.currency || 'INR')}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-indigo-500 text-center mt-6">
                      Generated on {new Date().toLocaleDateString()} for Internal Super Admin Review
                    </div>
                  </div>
                  <DialogFooter>
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => window.print()}>
                      <Download className="h-4 w-4 mr-2" /> Print / Download PDF
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-indigo-900/30 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-indigo-500">Plan Model:</span>
                <span className="text-indigo-300 font-bold uppercase">{activeLicense?.plan.pricingModel?.replace('_', ' ') || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-indigo-500">Base Price:</span>
                <span className="text-indigo-300">{formatCurrency(activeLicense?.plan.price || 0, activeLicense?.plan.currency)}</span>
              </div>
              {activeLicense?.customPrice !== null && activeLicense?.customPrice !== undefined && (
                <div className="flex justify-between">
                  <span className="text-amber-500">Custom Price:</span>
                  <span className="text-amber-400 font-bold">{formatCurrency(activeLicense.customPrice, activeLicense?.plan.currency)}</span>
                </div>
              )}
              {(activeLicense?.plan.discount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-500">Discount:</span>
                  <span className="text-green-400 font-bold">{activeLicense?.plan.discount}% OFF</span>
                </div>
              )}
              {activeLicense?.plan.pricingModel === 'per_user' && (
                <div className="flex justify-between">
                  <span className="text-indigo-500">Price/User:</span>
                  <span className="text-indigo-300">{formatCurrency(activeLicense?.plan.pricePerUser || 0, activeLicense?.plan.currency)}</span>
                </div>
              )}
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCustomPriceOpen(true)}
                  className="w-full h-7 text-[10px] border-amber-700 text-amber-300 hover:bg-amber-900/40"
                >
                  Set Custom Price
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-indigo-300">Subscription Status</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAssignPlanOpen(true)}
              className="h-6 px-2 text-[10px] text-indigo-400 hover:text-white hover:bg-indigo-800"
            >
              Update Plan
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <h3 className={`text-2xl font-bold ${daysRemaining < 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {daysRemaining} Days
              </h3>
              <Badge variant="outline" className="text-[10px] border-indigo-700 text-indigo-300">
                {activeLicense?.status.toUpperCase() || 'NO LICENSE'}
              </Badge>
            </div>
            <p className="text-xs text-indigo-400">Remaining until next bill</p>
            <div className="w-full bg-indigo-950 h-1.5 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${daysRemaining < 5 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-indigo-500'}`}
                style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 30) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-indigo-500 mt-2 font-mono">
              <span>Started: {activeLicense ? new Date(activeLicense.startDate).toLocaleDateString() : 'N/A'}</span>
              <span>Ends: {activeLicense ? new Date(activeLicense.endDate).toLocaleDateString() : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-900/60 to-indigo-800/40 border-indigo-700">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.userCount} / {org.userLimit}</p>
                <p className="text-sm text-indigo-300/70">Users in Organisation</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-indigo-700/50">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-indigo-400">Creation Date:</span>
                <span className="text-white">{new Date(org.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Target className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.leadCount}</p>
                <p className="text-sm text-indigo-300/70">Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.contactCount}</p>
                <p className="text-sm text-indigo-300/70">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.accountCount}</p>
                <p className="text-sm text-indigo-300/70">Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1e1b4b] border-indigo-900/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stats.opportunityCount}</p>
                <p className="text-sm text-indigo-300/70">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-800/30 border-green-700/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-white">
                  ₹{stats.totalRevenue.toLocaleString('en-IN')}
                </p>
                <p className="text-sm text-green-300/70">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organisation Info */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 bg-[#1e1b4b] border-indigo-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-white">Organisation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {org.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-indigo-200">{org.contactEmail}</span>
              </div>
            )}
            {org.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-indigo-200">{org.contactPhone}</span>
              </div>
            )}
            {org.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-indigo-200">{org.address}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-indigo-200">Created: {new Date(org.createdAt).toLocaleDateString()}</span>
            </div>
            {org.subscription?.plan && (
              <div className="pt-4 border-t border-indigo-800">
                <p className="text-sm font-medium text-indigo-300">Subscription Plan</p>
                <p className="text-lg font-bold text-indigo-400">{org.subscription.plan.name}</p>
                <p className="text-sm text-indigo-300/70">₹{org.subscription.plan.price}/period</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="md:col-span-2 bg-[#1e1b4b] border-indigo-900/50">
          <CardHeader>
            <CardTitle className="text-lg text-white">Users ({users.length})</CardTitle>
            <CardDescription className="text-indigo-300/70">All users in this organisation</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-indigo-800 hover:bg-indigo-900/30">
                  <TableHead className="text-indigo-300">User ID</TableHead>
                  <TableHead className="text-indigo-300">Name</TableHead>
                  <TableHead className="text-indigo-300">Email</TableHead>
                  <TableHead className="text-indigo-300">Role</TableHead>
                  <TableHead className="text-indigo-300">Position</TableHead>
                  <TableHead className="text-indigo-300">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-indigo-800/50 hover:bg-indigo-900/20">
                    <TableCell className="font-mono text-sm text-indigo-200">
                      {user.userId || '-'}
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="text-indigo-300/70">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className={user.role === 'admin' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'text-indigo-300/70 border-indigo-700'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-indigo-200">{user.position || '-'}</TableCell>
                    <TableCell className="text-indigo-300/70">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-indigo-300/70 py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AssignPlanDialog
        open={isAssignPlanOpen}
        onOpenChange={setIsAssignPlanOpen}
        organisationId={org.id}
        currentPlanId={activeLicense?.plan.id}
        organisationName={org.name}
      />

      <EditOrganisationDialog
        open={isEditOrgOpen}
        onOpenChange={setIsEditOrgOpen}
        organisation={org}
      />

      {activeLicense && (
        <SetCustomPriceDialog
          open={isCustomPriceOpen}
          onOpenChange={setIsCustomPriceOpen}
          licenseId={activeLicense.id}
          organisationName={org.name}
          currentPrice={activeLicense.plan.price}
          customPrice={activeLicense.customPrice}
          currency={activeLicense.plan.currency}
        />
      )}
    </div>
  )
}
