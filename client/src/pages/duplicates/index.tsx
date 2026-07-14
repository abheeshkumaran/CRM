import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { getDuplicateLeads } from "@/services/leadService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Search, Phone, Mail, RefreshCw, ShieldAlert } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { isAdmin, getUserInfo } from "@/lib/utils"

interface DuplicateGroup {
  phone?: string;
  email?: string;
  count: number;
  lead_ids: string[];
  names: string[];
  type: 'phone' | 'email';
}

export default function DuplicatesPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [user] = useState(() => getUserInfo())
  const hasAccess = isAdmin(user)

  // Check user role on mount and redirect if needed
  useEffect(() => {
    if (user !== undefined) {
      if (!hasAccess) {
        // Redirect non-admin users
        navigate('/dashboard')
      }
    } else if (localStorage.getItem('userInfo') === null) {
      navigate('/login')
    }
  }, [navigate, hasAccess, user])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['duplicate-leads'],
    queryFn: getDuplicateLeads,
    enabled: hasAccess // Only fetch if user has access
  })

  const duplicates: DuplicateGroup[] = data?.duplicates || []

  // Show nothing while checking access
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center">
              Only organisation admins can access duplicate leads management.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredDuplicates = duplicates.filter(dup => {
    const searchLower = searchTerm.toLowerCase()
    return (
      dup.phone?.includes(searchLower) ||
      dup.email?.toLowerCase().includes(searchLower) ||
      dup.names.some(name => name.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-500" />
            Duplicate Leads
          </h1>
          <p className="text-muted-foreground mt-1">
            Identify and manage duplicate lead entries in your system
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duplicate Groups</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{duplicates.length}</div>
            <p className="text-xs text-muted-foreground">Groups with duplicate entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {duplicates.filter(d => d.type === 'phone').length}
            </div>
            <p className="text-xs text-muted-foreground">Duplicate phone numbers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">By Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {duplicates.filter(d => d.type === 'email').length}
            </div>
            <p className="text-xs text-muted-foreground">Duplicate email addresses</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search duplicates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Duplicates List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDuplicates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchTerm ? "No matching duplicates found" : "No duplicates detected"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? "Try adjusting your search" : "Your lead database is clean!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredDuplicates.map((dup, index) => (
            <Card key={index} className="border-orange-200 dark:border-orange-900">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {dup.type === 'phone' ? (
                      <Phone className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Mail className="h-5 w-5 text-orange-500" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {dup.type === 'phone' ? dup.phone : dup.email}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {dup.count} duplicate entries found
                      </p>
                    </div>
                  </div>
                  <Badge variant="destructive">{dup.count} Duplicates</Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Duplicate Leads:</p>
                  <div className="grid gap-2">
                    {dup.names.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <span className="text-sm">{name}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/leads/${dup.lead_ids[idx]}`)}
                        >
                          View Lead
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>Action Required:</strong> Review these leads and merge or delete duplicates to maintain data quality.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
