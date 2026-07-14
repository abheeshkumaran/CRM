import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useMutation, useQuery } from "@tanstack/react-query"
import { createEmailCampaign, getEmailLists } from "@/services/marketingService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"

const STEPS = ['Details', 'Recipients', 'Content', 'Review']

export default function CreateCampaignPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)

  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [listId, setListId] = useState("")
  const [content, setContent] = useState("")

  // Fetch lists
  const { data: lists } = useQuery({ queryKey: ['emailLists'], queryFn: () => getEmailLists() })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; subject: string; emailList: string; content: string }) => createEmailCampaign(data),
    onSuccess: () => {
      toast.success("Campaign created successfully")
      navigate('/marketing')
    },
    onError: (error: { message: string }) => {
      toast.error(`Error: ${error.message}`)
    }
  })

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Submit
      createMutation.mutate({
        name,
        subject,
        emailList: listId,
        content
      })
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center space-x-4 mb-8">
        <div className="flex-1 flex justify-center space-x-4">
          {STEPS.map((step, i) => (
            <div key={step} className={`flex items-center space-x-2 ${i === currentStep ? 'text-primary font-bold' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${i === currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-gray-300'}`}>
                {i + 1}
              </div>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <div className="w-20" /> {/* Spacer */}
      </div>

      <Card>
        <CardContent className="p-8">
          {currentStep === 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Campaign Details</h2>
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Monthly Newsletter" />
                <p className="text-sm text-muted-foreground">Internal name for your reference.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject Line</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Big News Inside!" />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Select Recipients</h2>
              <div className="space-y-2">
                <Label>Email List</Label>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lists?.data?.map((l: { id: string, name: string, contacts?: unknown[] }) => (
                      <SelectItem key={l.id} value={l.id}>{l.name} ({l.contacts?.length || 0} contacts)</SelectItem>
                    ))}
                    {(!lists?.data || lists.data.length === 0) && (
                      <div className="p-2 text-sm text-yellow-600">
                        No lists found. <a href="/marketing/lists" className="underline font-bold">Create a list first</a>
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Design Content</h2>
              <div className="space-y-2">
                <Label>HTML Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] font-mono"
                  placeholder="<html><body><h1>Hello!</h1></body></html>"
                />
                <p className="text-sm text-muted-foreground">Enter raw HTML for now. Rich Text Editor coming soon.</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Review & Schedule</h2>
              <div className="bg-muted p-4 rounded-md space-y-2">
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-semibold">Name:</span>
                  <span className="col-span-2">{name}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-semibold">Subject:</span>
                  <span className="col-span-2">{subject}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <span className="font-semibold">Recipients:</span>
                  {/* Ideally look up list name from ID */}
                  <span className="col-span-2">{listId}</span>
                </div>
              </div>
              <div className="flex items-center justify-center p-8 border rounded-md border-dashed">
                Preview of content will appear here.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={createMutation.isPending}>
          {currentStep === STEPS.length - 1 ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Save & Finish
            </>
          ) : (
            <>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
