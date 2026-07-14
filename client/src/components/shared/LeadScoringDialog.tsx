
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { updateOrganisation, type LeadScoringConfig } from "@/services/settingsService"

interface LeadScoringDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialValues?: LeadScoringConfig
}

export function LeadScoringDialog({ children, open, onOpenChange, initialValues }: LeadScoringDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  const queryClient = useQueryClient()

  const form = useForm<LeadScoringConfig>({
    defaultValues: initialValues || {
      emailOpened: 1,
      linkClicked: 3,
      formSubmitted: 5,
      callConnected: 10,
      websiteVisit: 1
    }
  })

  // Reset form when initialValues change
  useEffect(() => {
    if (initialValues) {
      form.reset(initialValues)
    }
  }, [initialValues, form])

  const mutation = useMutation({
    mutationFn: (data: LeadScoringConfig) => updateOrganisation({ leadScoringConfig: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organisation"] })
      toast.success("Scoring weights updated successfully")
      finalOnOpenChange?.(false)
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update settings")
    },
  })

  function onSubmit(values: LeadScoringConfig) {
    mutation.mutate(values)
  }

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Scoring Weights</DialogTitle>
          <DialogDescription>
            Set the point value for each interaction type.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="emailOpened"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Opened</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="linkClicked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link Clicked</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="formSubmitted"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Submitted</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="callConnected"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call Connected</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="websiteVisit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website Visit</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Weights
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
