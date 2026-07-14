import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCommissions, createCommission, updateCommission, deleteCommission, type Commission } from "@/services/commissionService";
import { getUsers } from "@/services/userService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Calendar, DollarSign, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CommissionsPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    userId: "", // In a real app, this would be a user select
    amount: "",
    type: "commission",
    description: "",
    status: "pending"
  });

  const { data: commissions = [], isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: getCommissions
  });

  const { data: userData } = useQuery({
    queryKey: ['users', 'list'],
    queryFn: () => getUsers(),
  });
  const users = userData?.users || (Array.isArray(userData) ? userData : []);

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createCommission({ ...data, amount: typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount as number) } as unknown as Commission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Commission added successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to add commission");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: Record<string, unknown> }) =>
      updateCommission(id, { ...data, amount: typeof data.amount === 'string' ? parseFloat(data.amount) : (data.amount as number) } as unknown as Commission),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Commission updated successfully");
    },
    onError: (error: { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to update commission");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCommission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commissions'] });
      toast.success("Commission deleted");
    },
    onError: () => {
      toast.error("Failed to delete commission");
    }
  });

  const resetForm = () => {
    setFormData({
      userId: "",
      amount: "",
      type: "commission",
      description: "",
      status: "pending"
    });
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!formData.amount || !formData.type) return;

    // For now, we'll assume the current user if no user selected, 
    // OR we need a way to select users. 
    // Since we didn't build a UserSelect component yet, we'll require a User ID input 
    // or just default to the current user (which the backend might override if we are not admin)
    // Ideally we should use a Combobox to select from existing users.

    const payload = {
      ...formData,
      // Fallback: expect the user to enter an ID for now, 
      // or we could fetch users. Let's keep it simple for v1.
      userId: formData.userId || "self"
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (item: Commission) => {
    setFormData({
      userId: item.userId,
      amount: item.amount.toString(),
      type: item.type,
      description: item.description || "",
      status: item.status
    });
    setEditingId(item.id);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Sales Commissions</h1>
          <p className="text-gray-500 mt-1">Track and manage sales team commissions.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/25 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />
              Add Commission
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Commission' : 'Add Commission'}</DialogTitle>
              <DialogDescription>
                Record a new commission or bonus for a sales agent.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="userId">User</Label>
                <Select
                  value={formData.userId}
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                >
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Select a user (or 'self')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="self">Me (Self)</SelectItem>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Admin: Select User. Agent: Select 'Me' for self.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      id="amount"
                      type="number"
                      className="pl-9"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="bonus">Bonus</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                  disabled={!editingId} // Only allow status change on edit for now
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g. Q4 Performance Bonus"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save Commission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>View all recorded commissions and payouts.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">Loading commissions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length > 0 ? (
                  commissions.map((item: Commission) => (
                    <TableRow key={item.id}>
                      <TableCell className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(item.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.description || "N/A"}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          {item.userId === 'self' ? 'Me' : item.userId.substring(0, 8) + '...'}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{item.type}</TableCell>
                      <TableCell className="font-bold">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency || 'INR' }).format(item.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'paid' ? 'default' :
                              item.status === 'approved' ? 'secondary' :
                                item.status === 'rejected' ? 'destructive' : 'outline'
                          }
                          className={item.status === 'paid' ? 'bg-green-600' : ''}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => deleteMutation.mutate(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No commissions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
