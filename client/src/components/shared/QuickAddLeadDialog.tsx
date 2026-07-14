import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
// import { Loader2 } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createLead, type CreateLeadData } from "@/services/leadService"
import { getUsers } from "@/services/settingsService"
import { useQuery } from "@tanstack/react-query"
import DynamicCustomFields from "@/components/forms/DynamicCustomFields"
import { countryCodes, identifyCountryFromPhone } from "@/lib/countryCodes"
import { Globe } from "lucide-react"
import { useLeadStatuses } from "@/hooks/useLeadStatuses"

// interface for Form Data
interface QuickLeadFormData {
  firstName: string
  lastName?: string
  email?: string
  phone: string
  phoneCountryCode: string
  secondaryPhone?: string
  company?: string
  enquiryAbout?: string
  source: string
  status: string
  assignedTo?: string
  customFields?: Record<string, unknown>
}

interface QuickAddLeadDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function QuickAddLeadDialog({ children, open, onOpenChange }: QuickAddLeadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({})
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  const { statuses } = useLeadStatuses()
  const queryClient = useQueryClient()

  const form = useForm<QuickLeadFormData>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      phoneCountryCode: "+91",
      secondaryPhone: "",
      company: "",
      enquiryAbout: "",
      source: "manual",
      status: "", // Set dynamically via useEffect
      assignedTo: "",
    },
  })

  // Auto-set default status from settings
  useEffect(() => {
    if (statuses?.length > 0) {
      const defaultStatus = statuses.find(s => s.isDefault);
      if (defaultStatus && !form.getValues('status')) {
        form.setValue('status', defaultStatus.id);
      } else if (!form.getValues('status')) {
        form.setValue('status', 'new'); // Fallback if no default marked
      }
    }
  }, [statuses, form]);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })
  const users = usersData?.users || []

  const mutation = useMutation({
    mutationFn: createLead,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] })
      if (data?.isReEnquiry) {
        toast.info(data.message || "Lead already exists. Marked as a re-enquiry.");
      } else {
        toast.success("Lead created successfully")
      }
      finalOnOpenChange?.(false)
      form.reset()
      setCustomFieldValues({})
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to create lead")
    },
  })

  function onSubmit(values: QuickLeadFormData) {
    // Sanitize payload: Remove empty strings and convert to undefined for optional fields
    const payload: CreateLeadData = {
      firstName: values.firstName,
      phone: values.phone,
      phoneCountryCode: values.phoneCountryCode,
      source: values.source,
      status: values.status,
    };

    // Only add optional fields if they have values
    if (values.lastName && values.lastName.trim()) {
      payload.lastName = values.lastName.trim();
    }
    if (values.email && values.email.trim()) {
      payload.email = values.email.trim();
    }
    if (values.secondaryPhone && values.secondaryPhone.trim()) {
      payload.secondaryPhone = values.secondaryPhone.trim();
    }
    if (values.company && values.company.trim()) {
      payload.company = values.company.trim();
    }
    if (values.enquiryAbout && values.enquiryAbout.trim()) {
      payload.enquiryAbout = values.enquiryAbout.trim();
    }
    if (values.assignedTo && values.assignedTo !== "unassigned") {
      payload.assignedTo = values.assignedTo;
    }
    if (Object.keys(customFieldValues).length > 0) {
      (payload as any).customFields = customFieldValues;
    }
    mutation.mutate(payload)

  }

  const handleCustomFieldChange = (name: string, value: unknown) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[425px] p-4 sm:p-6 rounded-xl sm:rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold">Quick Add Lead</DialogTitle>
          <DialogDescription className="text-sm">
            Add a new lead to your pipeline quickly.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contact Details Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground border-b pb-2">Contact Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  rules={{ required: "First name is required", minLength: { value: 2, message: "Min 2 chars" } }}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">First Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Firstname" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  rules={{ required: "Last name is required", minLength: { value: 2, message: "Min 2 chars" } }}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Name <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input placeholder="Enter Lastname" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  rules={{
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: "Invalid email address"
                    }
                  }}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                      <FormControl>
                        <Input placeholder="email@example.com" className="h-10" {...field} />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <FormField
                    control={form.control}
                    name="phoneCountryCode"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Code</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-10 px-2">
                              <SelectValue>
                                {field.value}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            {countryCodes.map((c) => (
                              <SelectItem key={c.code + c.prefix} value={c.prefix}>
                                <span className="flex items-center gap-2">
                                  <span>{c.flag}</span>
                                  <span className="font-mono">{c.prefix}</span>
                                  <span className="text-muted-foreground text-[10px] truncate max-w-[60px]">{c.name}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    rules={{
                      required: "Phone number is required",
                      validate: (value, formValues) => {
                        if (!value) return "Phone number is required";
                        if (formValues.phoneCountryCode === '+91' && value.length !== 10) {
                          return "Indian phone numbers must be exactly 10 digits";
                        }
                        if (!/^\d{5,15}$/.test(value)) return "Invalid phone format";
                        return true;
                      }
                    }}
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone <span className="text-red-500">*</span></FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Phone"
                            {...field}
                            className="h-10"
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              // Auto-identify country if it starts with +
                              if (rawValue.startsWith('+')) {
                                const identified = identifyCountryFromPhone(rawValue);
                                if (identified) {
                                  form.setValue('phoneCountryCode', identified.country.prefix);
                                  field.onChange(identified.localNumber);
                                  return;
                                }
                              }
                              // Otherwise just clean and set
                              const value = rawValue.replace(/\D/g, '');
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="secondaryPhone"
                  rules={{
                    validate: (value) => {
                      if (!value) return true;
                      if (value.startsWith('+91') && value.length !== 13) {
                        return "Indian phone numbers must be exactly 10 digits";
                      }
                      if (!/^\+?\d{5,15}$/.test(value)) return "Invalid phone format";
                      return true;
                    }
                  }}
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alt Phone <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          placeholder="alternative number"
                          {...field}
                          maxLength={16}
                          className="h-10"
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d+]/g, '');
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Lead Info Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground border-b pb-2">Lead Info</h4>
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc" className="h-10" {...field} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enquiryAbout"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enquiry About <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Course, service..." className="h-10" {...field} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="website">Website</SelectItem>
                          <SelectItem value="referral">Referral</SelectItem>
                          <SelectItem value="cold_call">Cold Call</SelectItem>
                          <SelectItem value="social_media">Social Media</SelectItem>
                          <SelectItem value="email_campaign">Email Campaign</SelectItem>
                          <SelectItem value="meta_ads">Meta Ads</SelectItem>
                          <SelectItem value="google_ads">Google Ads</SelectItem>
                          <SelectItem value="import">Bulk Import</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {statuses.filter(status => status.id !== 'won' && status.id !== 'lost').map((status) => (
                            <SelectItem key={status.id} value={status.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: status.color }}
                                />
                                {status.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign To <span className="text-muted-foreground font-normal normal-case">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user: { id: string; firstName: string; lastName: string }) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-2">
              {/* Only show header if there are custom fields, but logic is inside component. 
                We can wrap it or just separate it visually. 
                DynamicCustomFields usually handles its own rendering. 
                Adding a wrapper for spacing. */}
              <DynamicCustomFields
                entityType="Lead"
                values={customFieldValues}
                onChange={handleCustomFieldChange}
              />
            </div>

            <DialogFooter className="pt-4 flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => finalOnOpenChange?.(false)}
                className="h-10 flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={mutation.isPending} className="h-10 flex-1 sm:flex-none">
                Create Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}