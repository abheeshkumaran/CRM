
import { useState, useEffect } from "react"
import { isAdmin, getUserInfo } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useFieldArray, type Control, type UseFormWatch } from "react-hook-form"
import { Loader2, Plus, Trash2 } from "lucide-react"
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
import { createAssignmentRule, updateAssignmentRule, type CreateAssignmentRuleData, type AssignmentRule } from "@/services/assignmentRuleService"
import { useQuery } from "@tanstack/react-query"
import { getUsers, getBranches } from "@/services/settingsService"

interface AssignmentRuleDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  rule?: AssignmentRule
}

export function AssignmentRuleDialog({ children, open, onOpenChange, rule }: AssignmentRuleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined

  const finalOpen = isControlled ? open : internalOpen
  const finalOnOpenChange = isControlled ? onOpenChange : setInternalOpen

  const queryClient = useQueryClient()

  const user = getUserInfo();
  const userRole = user?.role?.name || user?.role; // Handle object or string
  const userBranchId = user?.branchId;
  const isAdminUser = isAdmin(user);

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  })

  const { data: branchesData } = useQuery({
    queryKey: ['branches-for-rules'],
    queryFn: async () => {
      if (isAdminUser) {
        return getBranches();
      }
      // Branch managers: fetch managed branches
      const res = await (await import('@/services/api')).api.get('/users/my-team');
      return { branches: res.data?.managedBranches || [] };
    }
  })

  const users = (usersData?.users || []).filter((u: { id: string; firstName: string; lastName: string }) => u && typeof u === 'object');
  const branches = branchesData?.branches || [];
  const showBranchSelector = branches.length > 0;

  const form = useForm<CreateAssignmentRuleData>({
    defaultValues: {
      name: "",
      description: "",
      entity: "Lead",
      distributionType: "specific_user",
      criteria: [{ field: "source", operator: "equals", value: "" }],
      assignTo: { type: 'user', value: '', users: [] },
      priority: 1,
      isActive: true,
      enableRotation: false,
      timeLimitMinutes: 60,
      rotationType: 'random',
      rotationPool: [],
      branchId: userBranchId || ""
    }
  })

  useEffect(() => {
    if (rule) {
      form.reset({
        name: rule.name,
        description: rule.description,
        entity: rule.entity,
        distributionType: rule.distributionType,
        criteria: rule.criteria.length ? rule.criteria : [{ field: "source", operator: "equals", value: "" }],
        assignTo: rule.assignTo,
        priority: rule.priority,
        isActive: rule.isActive,
        enableRotation: rule.enableRotation || false,
        timeLimitMinutes: rule.timeLimitMinutes || 60,
        rotationType: rule.rotationType || 'random',
        rotationPool: rule.rotationPool || [],
        branchId: rule.branchId || userBranchId || ""
      })
    } else {
      form.reset({
        name: "",
        description: "",
        entity: "Lead",
        distributionType: "specific_user",
        criteria: [{ field: "source", operator: "equals", value: "" }],
        assignTo: { type: 'user', value: '', users: [] },
        priority: 1,
        isActive: true,
        enableRotation: false,
        timeLimitMinutes: 60,
        rotationType: 'random',
        rotationPool: [],
        branchId: userBranchId || ""
      })
    }
  }, [rule, finalOpen, form, userBranchId])

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "criteria"
  })

  const mutation = useMutation({
    mutationFn: (values: CreateAssignmentRuleData) => {
      // If branchId is empty string or placeholder, make it null for a global rule
      const payload = { ...values };
      if (payload.branchId === "" || payload.branchId === "all_branches_placeholder") {
        payload.branchId = null as any;
      }

      if (rule) {
        return updateAssignmentRule(rule.id, payload)
      }
      return createAssignmentRule(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assignment-rules"] })
      toast.success(rule ? "Rule updated successfully" : "Rule created successfully")
      finalOnOpenChange?.(false)
      form.reset()
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || `Failed to ${rule ? 'update' : 'create'} rule`)
    },
  })

  function onSubmit(values: CreateAssignmentRuleData) {
    mutation.mutate(values)
  }

  return (
    <Dialog open={finalOpen} onOpenChange={finalOnOpenChange}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Assignment Rule' : 'Create Assignment Rule'}</DialogTitle>
          <DialogDescription>
            Define criteria to automatically assign leads.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {showBranchSelector && (
              <FormField
                control={form.control}
                name="branchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Branch (Default: All)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all_branches_placeholder">All Branches</SelectItem>
                        {branches.map((b: { id: string, name: string }) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. US Leads" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <FormLabel>Criteria</FormLabel>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ field: "source", operator: "equals", value: "" })}>
                  <Plus className="h-3 w-3 mr-1" /> Add Condition
                </Button>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto p-1">
                {fields.map((field, index) => (
                  <CriteriaRow
                    key={field.id}
                    index={index}
                    control={form.control}
                    remove={remove}
                    watch={form.watch}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="distributionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distribution Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="specific_user">Specific User</SelectItem>
                        <SelectItem value="campaign_users">Round Robin (Select Users)</SelectItem>
                        <SelectItem value="round_robin_role">Round Robin by Role</SelectItem>
                        <SelectItem value="top_performer">Top Performer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.watch('distributionType') === 'specific_user' && (
                <FormField
                  control={form.control}
                  name="assignTo.value"
                  rules={{ required: "User is required" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select User</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((user: { id: string, firstName: string, lastName: string }) => (
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
              )}
            </div>

            <div className="space-y-4 border-t pt-4 mt-4">
              <h3 className="font-medium">Lead Rotation Policy (SLA)</h3>
              <FormField
                control={form.control}
                name="enableRotation"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Auto-Rotation</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Automatically re-assign leads if not acted upon within a time limit.
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch('enableRotation') && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <FormField
                    control={form.control}
                    name="timeLimitMinutes"
                    rules={{ required: "Time limit is required if rotation is enabled" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time Limit (Minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="rotationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rotation Logic</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select logic" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="random">Random User</SelectItem>
                            <SelectItem value="manager">Previous Owner's Manager</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {form.watch('distributionType') === 'campaign_users' && (
              <div className="space-y-2">
                <FormLabel>Select Users for Round Robin Distribution</FormLabel>
                <div className="border rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-2">
                  {users?.map((user: { id: string, firstName: string, lastName: string, dailyLeadQuota?: number }) => {
                    const currentUsers = form.watch('assignTo.users') || [];
                    const isSelected = currentUsers.includes(user.id);
                    return (
                      <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const prev = form.getValues('assignTo.users') || [];
                            if (e.target.checked) {
                              form.setValue('assignTo.users', [...prev, user.id]);
                            } else {
                              form.setValue('assignTo.users', prev.filter((id: string) => id !== user.id));
                            }
                          }}
                          className="rounded border-input"
                        />
                        <span className="text-sm">{user.firstName} {user.lastName}</span>
                        {user.dailyLeadQuota && (
                          <span className="text-xs text-muted-foreground">({user.dailyLeadQuota}/day)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Leads will be distributed round-robin among selected users</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {rule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog >
  )
}

function CriteriaRow({ index, control, remove, watch }: { index: number; control: Control<CreateAssignmentRuleData>; remove: (index: number) => void; watch: UseFormWatch<CreateAssignmentRuleData> }) {
  const fieldType = watch(`criteria.${index}.field`);

  return (
    <div className="flex gap-2 items-start">
      <FormField
        control={control}
        name={`criteria.${index}.field`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="source">Source</SelectItem>
                <SelectItem value="sourceDetails.campaignName">Campaign Name</SelectItem>
                <SelectItem value="address.country">Country</SelectItem>
                <SelectItem value="address.state">State</SelectItem>
                <SelectItem value="industry">Industry</SelectItem>
                <SelectItem value="leadScore">Lead Score</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`criteria.${index}.operator`}
        render={({ field }) => (
          <FormItem className="w-[120px]">
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="gt">Greater Than</SelectItem>
                <SelectItem value="lt">Less Than</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name={`criteria.${index}.value`}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormControl>
              <Input
                placeholder={fieldType === 'sourceDetails.campaignName' ? "e.g. Summer Sale 2024" : "Value"}
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />
      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
