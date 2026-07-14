import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getEvents, createEvent, deleteEvent, type CalendarEvent, type CreateEventData } from "@/services/eventService"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Calendar, Clock, Users, Video, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { EventDetailsDialog } from "@/components/EventDetailsDialog"
import { toast } from "sonner"


const typeColors: Record<string, string> = { meeting: 'bg-blue-500', call: 'bg-green-500', task: 'bg-orange-500', demo: 'bg-purple-500', follow_up: 'bg-pink-500', reminder: 'bg-yellow-500' }

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const queryClient = useQueryClient()

  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
  startOfWeek.setHours(0, 0, 0, 0) // Start of day

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6) // 6 days later (Sun-Sat)
  endOfWeek.setHours(23, 59, 59, 999) // End of day



  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendar-events', startOfWeek.toISOString()],
    queryFn: () => getEvents(startOfWeek.toISOString(), endOfWeek.toISOString()),
  })

  const events = (eventsData?.events || []).filter((e: CalendarEvent | null) => e && typeof e === 'object');


  const createMutation = useMutation({
    mutationFn: (data: CreateEventData) => createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setIsDialogOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast.success('Event deleted')
    }
  })

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const startTime = new Date(`${date}T${time}`)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour default

    createMutation.mutate({
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: formData.get('location') as string,
    })
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM

  const getEventsForDay = (date: Date) => {
    return events.filter((e: CalendarEvent) => {
      const eventDate = new Date(e.startTime)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction * 7)
    setCurrentDate(newDate)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
                <p className="text-muted-foreground mt-1">Schedule and manage your events.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 bg-card rounded-xl border border-border p-1 shadow-sm">
                  <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="font-semibold min-w-[200px] text-center text-sm text-foreground">{startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)} className="text-muted-foreground hover:text-foreground"><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild><Button className="shadow-lg shadow-primary/25 rounded-xl"><Plus className="h-4 w-4 mr-2" />New Event</Button></DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>Create Event</DialogTitle>
                        <DialogDescription className="sr-only">Schedule a new meeting, call, or task.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div><Label>Title</Label><Input name="title" required /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Type</Label>
                            <Select name="type" defaultValue="meeting">
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="meeting">Meeting</SelectItem>
                                <SelectItem value="call">Call</SelectItem>
                                <SelectItem value="demo">Demo</SelectItem>
                                <SelectItem value="follow_up">Follow Up</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div><Label>Date</Label><Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><Label>Time</Label><Input name="time" type="time" required defaultValue="09:00" /></div>
                          <div><Label>Location</Label><Input name="location" placeholder="Optional" /></div>
                        </div>
                      </div>
                      <DialogFooter><Button type="submit">Create Event</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="shadow-sm transition-all hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{events.length}</p>
                    <p className="text-xs text-muted-foreground font-medium">This Week</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm transition-all hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Video className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{events.filter((e: CalendarEvent) => e.type === 'meeting').length}</p>
                    <p className="text-xs text-muted-foreground font-medium">Meetings</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm transition-all hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{events.filter((e: CalendarEvent) => e.type === 'demo').length}</p>
                    <p className="text-xs text-muted-foreground font-medium">Demos</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm transition-all hover:-translate-y-1">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{events.filter((e: CalendarEvent) => e.status === 'completed').length}</p>
                    <p className="text-xs text-muted-foreground font-medium">Completed</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Weekly View (Desktop) / Daily List (Mobile) */}
            {isLoading ? (
              <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading calendar...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Mobile View: Vertically Stacked Days */}
                <div className="lg:hidden space-y-4">
                  {weekDays.map((_, i) => {
                    const date = new Date(startOfWeek)
                    date.setDate(startOfWeek.getDate() + i)
                    const dayEvents = getEventsForDay(date)
                    const isToday = date.toDateString() === new Date().toDateString()
                    
                    if (dayEvents.length === 0 && !isToday) return null;

                    return (
                      <Card key={i} className={`overflow-hidden border-l-4 ${isToday ? 'border-l-primary bg-primary/5' : 'border-l-muted'}`}>
                        <div className="p-3 border-b border-border flex justify-between items-center">
                          <div>
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{weekDays[i]}</span>
                            <h3 className="text-lg font-bold">{date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}</h3>
                          </div>
                          {isToday && <Badge className="bg-primary text-primary-foreground text-[10px]">TODAY</Badge>}
                        </div>
                        <CardContent className="p-3 space-y-2">
                          {dayEvents.length > 0 ? (
                            dayEvents.sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).map((event: CalendarEvent) => (
                              <div 
                                key={event.id}
                                onClick={() => handleEventClick(event)}
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98] ${typeColors[event.type]} bg-opacity-10`}
                                style={{ borderColor: `${typeColors[event.type].replace('bg-', 'var(--')}-500)` }}
                              >
                                <div className={`w-2 h-10 rounded-full ${typeColors[event.type]}`} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-sm truncate">{event.title}</h4>
                                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
                                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  {event.description && <p className="text-[10px] text-muted-foreground truncate italic">{event.description}</p>}
                                  <div className="flex items-center gap-1 mt-1">
                                    <Badge variant="outline" className="text-[9px] uppercase h-4 px-1.5 font-bold">
                                      {event.type.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic py-2 text-center">No events scheduled</p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                  {events.length === 0 && (
                    <div className="text-center py-12 px-6 bg-card rounded-2xl border border-dashed border-border">
                      <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
                      <h3 className="text-lg font-bold">Clear Schedule</h3>
                      <p className="text-sm text-muted-foreground">You have no events scheduled for this week.</p>
                      <Button variant="outline" className="mt-4 rounded-xl" onClick={() => setIsDialogOpen(true)}>Add Perspective</Button>
                    </div>
                  )}
                </div>

                {/* Desktop View: Weekly Grid */}
                <Card className="hidden lg:block overflow-hidden shadow-md">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-8 border-b border-border">
                      <div className="p-4 border-r border-border bg-muted/30"></div>
                      {weekDays.map((day, i) => {
                        const date = new Date(startOfWeek)
                        date.setDate(startOfWeek.getDate() + i)
                        const isToday = date.toDateString() === new Date().toDateString()
                        return (
                          <div key={day} className={`p-4 text-center border-r border-border ${isToday ? 'bg-primary/5' : 'bg-background'}`}>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{day}</p>
                            <p className={`text-xl font-bold mt-1 ${isToday ? 'text-primary' : 'text-foreground'}`}>{date.getDate()}</p>
                          </div>
                        )
                      })}
                    </div>
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                      {hours.map(hour => (
                        <div key={hour} className="grid grid-cols-8 border-b border-border min-h-[100px]">
                          <div className="p-2 border-r border-border text-[10px] text-muted-foreground font-bold text-right pr-4 bg-muted/30 uppercase tracking-tighter">{hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}</div>
                          {weekDays.map((_, i) => {
                            const date = new Date(startOfWeek)
                            date.setDate(startOfWeek.getDate() + i)
                            const dayEvents = getEventsForDay(date).filter((e: CalendarEvent) => new Date(e.startTime).getHours() === hour)
                            return (
                              <div key={i} className="border-r border-border p-1 relative hover:bg-muted/10 transition-colors">
                                {dayEvents.map((event: CalendarEvent) => (
                                  <div
                                    key={event.id}
                                    className={`${typeColors[event.type] || 'bg-primary'} text-white text-[11px] p-2 rounded-lg shadow-sm mb-1 cursor-pointer hover:brightness-110 hover:scale-[1.02] transition-all`}
                                    onClick={() => handleEventClick(event)}
                                  >
                                    <div className="font-bold truncate">{event.title}</div>
                                    {event.description && <div className="truncate opacity-80 text-[9px] mt-0.5">{event.description}</div>}
                                  </div>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onDelete={(id) => deleteMutation.mutate(id)}
      />
    </div>
  )
}
