import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { getCheckIns, type CheckIn } from "@/services/checkInService"
import { getUsers } from "@/services/settingsService"
import MapComponent from "@/components/common/MapComponent"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Clock, CheckCircle, Navigation, TrendingUp, Activity, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"

import { toast } from "sonner"
import { createCheckIn } from "@/services/checkInService"
import { useQueryClient } from "@tanstack/react-query"
import { getUserInfo, cn } from "@/lib/utils"

export default function FieldForcePage() {
  const [selectedDate] = useState(new Date())
  const [page, setPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const queryClient = useQueryClient()

  // Mutation for check-in with optimistic updates
  const checkInMutation = useMutation({
    mutationFn: (data: { type: 'CHECK_IN', latitude?: number, longitude?: number, address?: string }) => 
      createCheckIn(data),
    onMutate: async (newCheckIn) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['checkins', selectedDate.toISOString()] })
      await queryClient.cancelQueries({ queryKey: ['checkins-recent'] })

      // Snapshot previous values
      const previousCheckIns = queryClient.getQueryData(['checkins', selectedDate.toISOString()])
      const previousRecent = queryClient.getQueryData(['checkins-recent'])

      // Get current user data for optimistic update
      const currentUser = getUserInfo()

      // Create optimistic check-in
      const optimisticCheckIn: CheckIn = {
        id: `temp-${Date.now()}`,
        type: newCheckIn.type,
        latitude: newCheckIn.latitude,
        longitude: newCheckIn.longitude,
        address: newCheckIn.address || 'Unknown Location',
        userId: currentUser?.id || 'temp-user',
        organisationId: currentUser?.organisationId || 'temp-org',
        createdAt: new Date().toISOString(),
        user: currentUser ? {
          firstName: currentUser.firstName,
          lastName: currentUser.lastName
        } : undefined
      }

      // Optimistically update cache
      queryClient.setQueryData(['checkins', selectedDate.toISOString()], (old: any) => {
        if (!old) return { checkIns: [optimisticCheckIn] }
        return {
          ...old,
          checkIns: [optimisticCheckIn, ...(old.checkIns || [])]
        }
      })

      queryClient.setQueryData(['checkins-recent'], (old: any) => {
        if (!old) return { checkIns: [optimisticCheckIn] }
        if (Array.isArray(old)) return [optimisticCheckIn, ...old]
        return {
          ...old,
          checkIns: [optimisticCheckIn, ...(old.checkIns || [])]
        }
      })

      toast.success("Checked in successfully!")

      return { previousCheckIns, previousRecent }
    },
    onError: (err, newCheckIn, context) => {
      // Rollback on error
      if (context?.previousCheckIns) {
        queryClient.setQueryData(['checkins', selectedDate.toISOString()], context.previousCheckIns)
      }
      if (context?.previousRecent) {
        queryClient.setQueryData(['checkins-recent'], context.previousRecent)
      }
      console.error(err)
      toast.error("Failed to check in")
    },
    onSuccess: () => {
      // Refetch to get real data from server
      queryClient.invalidateQueries({ queryKey: ['checkins', selectedDate.toISOString()] })
      queryClient.invalidateQueries({ queryKey: ['checkins-recent'] })
    }
  })

  const handleCheckIn = () => {
    // Helper to perform check-in
    const submitCheckIn = (lat?: number, lng?: number, addr?: string) => {
      checkInMutation.mutate({
        type: 'CHECK_IN',
        latitude: lat,
        longitude: lng,
        address: addr || 'Unknown Location'
      })
    }

    // Check if environment supports geolocation (HTTPS or localhost)
    const isSecure = window.isSecureContext;

    if (!navigator.geolocation || !isSecure) {
      console.warn("Geolocation requires a secure context (HTTPS) or is not supported. Proceeding without location.")
      toast.warning("Location unavailable. Checking in without coordinates.")
      submitCheckIn(undefined, undefined, 'Location unavailable (Insecure Context/Unsupported)')
      return
    }

    // --- Robust Geolocation Flow ---
    // 1. Initial attempt: High accuracy, 15s timeout
    // 2. Fallback: Low accuracy, 10s timeout (faster indoors/weak signal)
    
    const optionsHigh: PositionOptions = { 
      timeout: 15000, 
      enableHighAccuracy: true, 
      maximumAge: 0 
    };
    
    const optionsLow: PositionOptions = { 
      timeout: 10000, 
      enableHighAccuracy: false, 
      maximumAge: 60000 // Allow 1-minute old cached location for reliability
    };

    const fetchLocation = (options: PositionOptions, isRetry = false) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let locationName = 'Location acquired';
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
              headers: {
                'Accept-Language': 'en-US,en'
              }
            });
            if (response.ok) {
              const data = await response.json();
              if (data && data.display_name) {
                // Extract the first 3 parts of the address for a concise name
                const parts = data.display_name.split(',');
                locationName = parts.slice(0, 3).join(',').trim();
              }
            }
          } catch (err) {
            console.error('Reverse geocoding failed:', err);
          }
          submitCheckIn(latitude, longitude, locationName);
        },
        (error) => {
          console.error(`Geolocation ${isRetry ? 'fallback' : 'primary'} error:`, error)
          
          // Fallback to low accuracy if primary fails for reasons other than permission
          if (!isRetry && (error.code === error.POSITION_UNAVAILABLE || error.code === error.TIMEOUT)) {
            console.log("Primary location fetch failed/timed out. Retrying with lower accuracy...");
            fetchLocation(optionsLow, true);
            return;
          }

          let errorMsg = "Unable to retrieve location."
          if (error.code === error.PERMISSION_DENIED) errorMsg = "Location permission denied."
          else if (error.code === error.POSITION_UNAVAILABLE) errorMsg = "Position unavailable."
          else if (error.code === error.TIMEOUT) errorMsg = "Location request timed out."

          toast.warning(`${errorMsg} Checking in without coordinates.`)
          submitCheckIn(undefined, undefined, `Location error: ${errorMsg}`)
        },
        options
      )
    }

    fetchLocation(optionsHigh);
  }

  const { data: checkInsData, isLoading } = useQuery({
    queryKey: ['checkins', selectedDate.toISOString()],
    queryFn: () => getCheckIns({ date: selectedDate.toISOString() })
  })

  const { data: recentCheckInsRaw } = useQuery({
    queryKey: ['checkins-recent', page, sortOrder],
    queryFn: () => getCheckIns({ 
      limit: 10, 
      offset: (page - 1) * 10,
      sortBy: 'createdAt',
      sortOrder: sortOrder
    })
  })

  // Use specific recent data for the list, unrelated to today's date filter
  const recentActivityList = useMemo(() => recentCheckInsRaw?.checkIns || (Array.isArray(recentCheckInsRaw) ? recentCheckInsRaw : []) || [], [recentCheckInsRaw]);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })

  const checkIns = useMemo(() => (checkInsData?.checkIns || []).filter((c: CheckIn) => c && typeof c === 'object'), [checkInsData]);
  const users = useMemo(() => (usersData?.users || []).filter((u: { id: string; firstName: string; lastName: string; role: string }) => u && typeof u === 'object'), [usersData]);

  // Calculate productivity metrics based on actual data
  const productivityMetrics = useMemo(() => {
    if (checkIns.length === 0 || users.length === 0) return { score: 0, activeUsers: 0, inTransit: 0 }

    const activeUsers = checkIns.filter((c: { type: string }) => c.type === 'CHECK_IN').length
    const totalUsers = users.filter((u: { role: string }) => u.role === 'sales_rep' || u.role === 'field_agent').length
    const inTransit = Math.floor(activeUsers * 0.3) // Estimate 30% in transit

    const score = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0

    return { score, activeUsers, inTransit }
  }, [checkIns, users])

  // Create team activity from actual users and check-ins
  const teamActivity = useMemo(() => {
    return users
      .filter((u: { role: string }) => u.role === 'sales_rep' || u.role === 'field_agent')
      .slice(0, 10) // Show max 10 for UI
      .map((user: { id: string, firstName: string, lastName: string }) => {
        const userCheckIn = checkIns.find((c: { userId: string }) => c.userId === user.id)
        const status = userCheckIn ? 'checked_in' : 'offline'
        return {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          status,
          location: userCheckIn?.address || 'Unknown',
          latitude: userCheckIn?.latitude,
          longitude: userCheckIn?.longitude,
          time: userCheckIn ? format(new Date(userCheckIn.createdAt), 'HH:mm') : '--:--'
        }
      })
  }, [users, checkIns])

  const mapMarkers = useMemo(() => {
    return teamActivity
      .filter((m: { latitude?: number, longitude?: number }) => m.latitude && m.longitude)
      .map((m: { id: string, name: string, location: string, status: string, latitude: number, longitude: number }) => ({
        id: m.id,
        position: [m.latitude, m.longitude] as [number, number],
        title: m.name,
        description: m.location,
        status: m.status
      }))
  }, [teamActivity])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in': return <Badge className="bg-green-100 text-green-800">Checked In</Badge>
      case 'in_transit': return <Badge className="bg-blue-100 text-blue-800">In Transit</Badge>
      case 'checked_out': return <Badge className="bg-gray-100 text-gray-800">Checked Out</Badge>
      default: return <Badge variant="outline">Offline</Badge>
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Field Force</h1>
                <p className="text-muted-foreground mt-1">Track your field sales team activities</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCheckIn}
                  disabled={checkInMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                >
                  {checkInMutation.isPending ? <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
                  Check In Now
                </Button>
                <Button variant="outline"><Clock className="h-4 w-4 mr-2" />History</Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{productivityMetrics.activeUsers}</p>
                    <p className="text-sm text-muted-foreground">Currently Checked In</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Navigation className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{productivityMetrics.inTransit}</p>
                    <p className="text-sm text-muted-foreground">In Transit</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{checkIns.length}</p>
                    <p className="text-sm text-muted-foreground">Visits Today</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{productivityMetrics.score}%</p>
                    <p className="text-sm text-muted-foreground">Productivity Score</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Map View */}
              <Card className="lg:col-span-2 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Live Team Locations
                  </CardTitle>
                  <CardDescription>Real-time tracking of your field team</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1 min-h-[400px]">
                  <MapComponent markers={mapMarkers} className="h-full w-full rounded-b-xl" />
                </CardContent>
              </Card>

              {/* Team Activity */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Team Activity
                  </CardTitle>
                  <CardDescription>Live status updates</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto max-h-[400px]">
                  <div className="space-y-4">
                    {teamActivity.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No field team members found</p>
                      </div>
                    ) : (
                      teamActivity.map((member: { id: string, name: string, location: string, status: string, time: string }) => (
                        <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                                {member.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${member.status === 'checked_in' ? 'bg-green-500' : member.status === 'in_transit' ? 'bg-blue-500' : 'bg-muted-foreground'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.location}</p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(member.status)}
                            <p className="text-xs text-muted-foreground mt-1">{member.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Check-ins */}
            <Card>
              <CardHeader>
                <CardTitle>Check-in History</CardTitle>
                <CardDescription>Latest field activities</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center p-12">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : recentActivityList.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent check-ins found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-muted-foreground bg-muted/50 uppercase font-medium text-xs">
                        <tr>
                          <th className="px-6 py-3 rounded-l-lg">Team Member</th>
                          <th className="px-6 py-3">Type</th>
                          <th className="px-6 py-3 text-center">Coordinates</th>
                          <th className="px-6 py-3">Location</th>
                          <th className="px-6 py-3 rounded-r-lg">
                            <button 
                              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                              className="flex items-center gap-1 hover:text-foreground transition-colors group"
                            >
                              Time
                              <ArrowUpDown className={cn("h-3 w-3", sortOrder === 'asc' && "text-primary")} />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recentActivityList.map((checkIn: CheckIn) => (
                          <tr key={checkIn.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-foreground">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {checkIn.user?.firstName?.[0]}{checkIn.user?.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{checkIn.user?.firstName} {checkIn.user?.lastName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {checkIn.type === 'CHECK_IN' ?
                                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">Check In</Badge> :
                                <Badge variant="outline" className="text-muted-foreground">Check Out</Badge>
                              }
                            </td>
                            <td className="px-6 py-4 text-center">
                              {checkIn.latitude && checkIn.longitude ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex gap-2 text-[10px] tabular-nums font-mono text-muted-foreground whitespace-nowrap">
                                    <span>Lat: {checkIn.latitude.toFixed(4)}</span>
                                    <span>Lng: {checkIn.longitude.toFixed(4)}</span>
                                  </div>
                                  <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${checkIn.latitude},${checkIn.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline hover:text-primary/80 transition-all bg-primary/5 px-2 py-0.5 rounded-full"
                                  >
                                    <Navigation className="h-2 w-2" />
                                    View on Map
                                  </a>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground opacity-50 italic">No GPS Data</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{checkIn.address || 'Unknown'}</td>
                            <td className="px-6 py-4 text-muted-foreground">{format(new Date(checkIn.createdAt), 'MMM d, h:mm a')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Pagination Controls */}
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div className="text-xs text-muted-foreground">
                    Showing page {page}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-xs font-medium w-4 text-center">{page}</div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => p + 1)}
                      disabled={!recentCheckInsRaw || recentCheckInsRaw.length < 10}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
