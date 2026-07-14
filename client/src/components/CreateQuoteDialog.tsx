import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Percent } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createQuote, type CreateQuoteData } from "@/services/quoteService"
import { api } from "@/services/api"

interface CreateQuoteDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface LineItem {
  productName: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
}

export function CreateQuoteDialog({ children, open, onOpenChange }: CreateQuoteDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  const queryClient = useQueryClient()
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productName: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }
  ])

  // Memoize the default date to avoid impure render
  const [defaultValidUntil] = useState(() => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  const form = useForm<{
    title: string
    description?: string
    account?: string
    opportunity?: string
    contact?: string
    validUntil: string
    enableEMI: boolean
  }>({
    defaultValues: {
      title: "",
      description: "",
      validUntil: defaultValidUntil, // 30 days from now
      enableEMI: false,
    },
  })

  // Fetch accounts for dropdown
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data
  })

  // Fetch opportunities for dropdown
  const { data: opportunitiesData } = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => (await api.get('/opportunities')).data
  })

  // Fetch contacts for dropdown
  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => (await api.get('/contacts')).data
  })

  const accounts = accountsData?.accounts || []
  const opportunities = opportunitiesData?.opportunities || []
  const contacts = contactsData?.contacts || []

  const mutation = useMutation({
    mutationFn: (data: CreateQuoteData) => createQuote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] })
      toast.success("Quote created successfully")
      finalOnOpenChange?.(false)
      form.reset()
      setLineItems([{ productName: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }])
    },
    onError: (error: unknown) => {
      toast.error((error as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to create quote")
    },
  })

  const addLineItem = () => {
    setLineItems([...lineItems, { productName: "", description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }])
  }

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const calculateLineTotal = (item: LineItem) => {
    const quantity = Number(item.quantity) || 0
    const unitPrice = Number(item.unitPrice) || 0
    const discount = Number(item.discount) || 0
    const taxRate = Number(item.taxRate) || 0

    const subtotal = quantity * unitPrice
    const discountAmount = subtotal * (discount / 100)
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * (taxRate / 100)
    return afterDiscount + taxAmount
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      return sum + (quantity * unitPrice)
    }, 0)

    const totalDiscount = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const discount = Number(item.discount) || 0
      return sum + (quantity * unitPrice * discount / 100)
    }, 0)

    const totalTax = lineItems.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const discount = Number(item.discount) || 0
      const taxRate = Number(item.taxRate) || 0
      const afterDiscount = (quantity * unitPrice) - (quantity * unitPrice * discount / 100)
      return sum + (afterDiscount * taxRate / 100)
    }, 0)

    const grandTotal = subtotal - totalDiscount + totalTax

    return { subtotal, totalDiscount, totalTax, grandTotal }
  }

  function onSubmit(v: any) {
    const values = v as { title: string; description?: string; account?: string; opportunity?: string; contact?: string; validUntil: string; enableEMI: boolean };
    const totals = calculateTotals()

    const quoteData: CreateQuoteData & { totalDiscount: number; totalTax: number } = {
      title: values.title,
      description: values.description,
      account: values.account,
      opportunity: values.opportunity,
      contact: values.contact,
      validUntil: values.validUntil,
      isEMIEnabled: values.enableEMI,
      lineItems: lineItems.map(item => ({
        productName: item.productName,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: calculateLineTotal(item)
      })),
      subtotal: totals.subtotal,
      totalDiscount: totals.totalDiscount,
      totalTax: totals.totalTax,
      grandTotal: totals.grandTotal,
    }

    mutation.mutate(quoteData)
  }

  const totals = calculateTotals()

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Quote</DialogTitle>
          <DialogDescription>
            Create a new quote for your customer
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Quote title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="validUntil"
                rules={{ required: "Valid until date is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="account"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {accounts.map((account: { id: string; name: string }) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
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
                name="opportunity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opportunity (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select opportunity" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {opportunities.map((opp: { id: string; name: string }) => (
                          <SelectItem key={opp.id} value={opp.id}>
                            {opp.name}
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
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((contact: { id: string; firstName: string; lastName: string }) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.firstName} {contact.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Quote description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {lineItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => updateLineItem(index, 'productName', e.target.value)}
                    />
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      placeholder="Discount %"
                      value={item.discount}
                      onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      placeholder="Tax %"
                      value={item.taxRate}
                      onChange={(e) => updateLineItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="text-right text-sm font-medium">
                    Total: ₹{calculateLineTotal(item).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-dashed">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Percent className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="emi-toggle" className="text-sm font-semibold cursor-pointer">Enable EMI Option</Label>
                    <p className="text-xs text-muted-foreground">Allow customer to pay in installments</p>
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="enableEMI"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          id="emi-toggle"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="text-red-600">-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>₹{totals.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span className="text-green-600">₹{totals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => finalOnOpenChange?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Quote
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
