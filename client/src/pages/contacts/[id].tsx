import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Mail, Phone, Building, Briefcase, Pencil } from "lucide-react"
import { useState } from "react"
import { EditContactDialog } from "@/components/shared/EditContactDialog"
import TimelineFeed from "@/components/shared/TimelineFeed"

export default function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: contact, isLoading } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => (await api.get(`/contacts/${id}`)).data,
    enabled: !!id && id !== 'new' && id !== 'undefined'
  })

  if (id === 'new') return <div>Create Contact (Placeholder)</div>
  if (id === 'undefined') return <div className="p-8">Invalid Contact ID</div>
  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>
  if (!contact) return <div className="p-8">Contact not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/contacts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {contact.firstName} {contact.lastName}
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" /> {contact.jobTitle}
            <span className="mx-2">•</span>
            <Building className="h-4 w-4" /> {contact.account?.name || 'No Account'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline">{contact.email}</a>
            </div>
            {Array.isArray(contact.phones) && contact.phones.map((phone: { number: string; type: string }, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{phone.number} <span className="text-xs text-muted-foreground">({phone.type})</span></span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Timeline Feed */}
        <div className="md:col-span-2 lg:col-span-1">
          {id && <TimelineFeed type="contact" id={id} />}
        </div>
      </div>

      <EditContactDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        contact={contact}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['contact', id] })}
      />
    </div>
  )
}
