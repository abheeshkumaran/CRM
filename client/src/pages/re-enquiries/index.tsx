import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getReEnquiryLeads, type Lead } from "@/services/leadService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RefreshCw, Search, Phone, Mail, Building2, Calendar, TrendingUp, ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { formatDistanceToNow } from "date-fns"
import { isAdmin, isManager, getUserInfo } from "@/lib/utils"

export default function ReEnquiriesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [user] = useState(() => getUserInfo())
  const hasAccess = isManager(user) || (user?.permissions && (user.permissions.includes('leads:*') || user.permissions.includes('leads:read') || user.permissions.includes('*')));

  const [now] = useState(() => Date.now())

  // Check user role on mount
  useEffect(() => {
    if (!hasAccess && user !== undefined) {
      navigate('/dashboard')
    }
  }, [hasAccess, navigate, user])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['re-enquiry-leads'],
    queryFn: getReEnquiryLeads,
    enabled: hasAccess // Only fetch if user has access
  })

  const leads: Lead[] = data?.leads || []

  // Show nothing while checking access
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center">
              Only organisation admins and managers can access re-enquiry leads.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredLeads = leads.filter(lead => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (lead.firstName?.toLowerCase() || "").includes(searchLower) ||
      (lead.lastName?.toLowerCase() || "").includes(searchLower) ||
      (lead.email?.toLowerCase() || "").includes(searchLower) ||
      (lead.phone || "").includes(searchLower) ||
      (lead.company?.toLowerCase() || "").includes(searchLower)
    )
  })

  const getReEnquiryBadgeColor = (count: number) => {
    if (count >= 5) return "destructive"
    if (count >= 3) return "secondary"
    return "default"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Re-Enquiries</h1>
          <p className="text-muted-foreground mt-1">
            Leads who have enquired multiple times - high interest prospects
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Re-Enquiries</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leads.length}</div>
            <p className="text-xs text-muted-foreground">Leads showing continued interest</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(l => (l.reEnquiryCount || 0) >= 3).length}
            </div>
            <p className="text-xs text-muted-foreground">3+ enquiries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent (24h)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {leads.filter(l => {
                if (!l.lastEnquiryDate) return false
                const diff = now - new Date(l.lastEnquiryDate).getTime()
                return diff < 24 * 60 * 60 * 1000
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search re-enquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Re-Enquiry List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <RefreshCw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchTerm ? "No matching re-enquiries found" : "No re-enquiries yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? "Try adjusting your search" : "Re-enquiries will appear here when leads contact you again"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map((lead) => (
            <Card
              key={lead.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/leads/${lead.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {lead.firstName} {lead.lastName || ''}
                      </h3>
                      <Badge variant={getReEnquiryBadgeColor(lead.reEnquiryCount || 0)}>
                        {lead.reEnquiryCount || 0}x Re-Enquiry
                      </Badge>
                      {lead.lastEnquiryDate && (
                        <span className="text-sm text-muted-foreground">
                          Last: {formatDistanceToNow(new Date(lead.lastEnquiryDate), { addSuffix: true })}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      {lead.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{lead.phoneCountryCode || ''} {lead.phone}</span>
                        </div>
                      )}
                      {lead.company && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{lead.company}</span>
                        </div>
                      )}
                      {lead.assignedTo && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-medium">Assigned to:</span>
                          <span>{lead.assignedTo.firstName} {lead.assignedTo.lastName}</span>
                        </div>
                      )}
                    </div>

                    {lead.country && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        📍 {lead.country}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/leads/${lead.id}`)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
