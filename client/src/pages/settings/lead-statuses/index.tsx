import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  Plus, 
  GripVertical, 
  Trash2, 
  Pencil, 
  Save, 
  Undo2, 
  AlertCircle,
  Info,
  Star,
  StarOff
} from "lucide-react";
import { getOrganisation, updateOrganisation } from "@/services/settingsService";
import type { LeadStatus } from "@/services/settingsService";
import { DEFAULT_LEAD_STATUSES, DEFAULT_OPPORTUNITY_LEAD_STATUSES } from "@/hooks/useLeadStatuses";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reorder, useDragControls } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LeadStatusesSettingsPage() {
  const queryClient = useQueryClient();
  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  });

  const [activeTab, setActiveTab] = useState<"leads" | "opportunities">("leads");
  
  // States for lead statuses
  const [leadStatuses, setLeadStatuses] = useState<LeadStatus[]>([]);
  // States for opportunity lead statuses
  const [oppStatuses, setOppStatuses] = useState<LeadStatus[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editingStatus, setEditingStatus] = useState<LeadStatus | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Initialize local states when data is loaded
  useEffect(() => {
    if (orgData) {
      setLeadStatuses([...(orgData.leadStatuses || DEFAULT_LEAD_STATUSES)].sort((a, b) => a.order - b.order));
      setOppStatuses([...(orgData.opportunityLeadStatuses || DEFAULT_OPPORTUNITY_LEAD_STATUSES)].sort((a, b) => a.order - b.order));
    }
  }, [orgData]);

  const mutation = useMutation({
    mutationFn: (updates: { leadStatuses?: LeadStatus[]; opportunityLeadStatuses?: LeadStatus[] }) => 
      updateOrganisation(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      toast.success("Settings updated successfully");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update settings");
    }
  });

  const currentStatuses = activeTab === "leads" ? leadStatuses : oppStatuses;
  const setCurrentStatuses = activeTab === "leads" ? setLeadStatuses : setOppStatuses;

  const handleReorder = (newOrder: LeadStatus[]) => {
    const reordered = newOrder.map((s, index) => ({ ...s, order: index }));
    setCurrentStatuses(reordered);
    setIsEditing(true);
  };

  const handleAddStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const label = formData.get('label') as string;
    const color = formData.get('color') as string;

    if (!label) return;

    const newStatus: LeadStatus = {
      id: label.toLowerCase().replace(/\s+/g, '_'),
      label,
      color,
      isSystem: false,
      order: currentStatuses.length
    };

    setCurrentStatuses([...currentStatuses, newStatus]);
    setIsAddDialogOpen(false);
    setIsEditing(true);
  };

  const handleUpdateStatus = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStatus) return;

    const formData = new FormData(e.currentTarget);
    const label = formData.get('label') as string;
    const color = formData.get('color') as string;

    const updated = currentStatuses.map(s => 
      s.id === editingStatus.id ? { ...s, label, color } : s
    );

    setCurrentStatuses(updated);
    setEditingStatus(null);
    setIsEditing(true);
  };

  const handleDeleteStatus = (id: string) => {
    const statusToDelete = currentStatuses.find(s => s.id === id);
    if (statusToDelete?.isSystem) {
      toast.error("System statuses cannot be deleted");
      return;
    }
    if (statusToDelete?.isDefault) {
      toast.error("Cannot delete the default status. Please set another status as default first.");
      return;
    }

    setCurrentStatuses(currentStatuses.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })));
    setIsEditing(true);
  };

  const handleSetDefault = (id: string) => {
    const updated = currentStatuses.map(s => ({
      ...s,
      isDefault: s.id === id
    }));
    setCurrentStatuses(updated);
    setIsEditing(true);
    toast.info(`Default status set to "${currentStatuses.find(s => s.id === id)?.label}"`);
  };

  const handleSave = () => {
    mutation.mutate({
      leadStatuses,
      opportunityLeadStatuses: oppStatuses
    });
  };

  const handleReset = () => {
    if (orgData) {
      setLeadStatuses([...(orgData.leadStatuses || DEFAULT_LEAD_STATUSES)].sort((a, b) => a.order - b.order));
      setOppStatuses([...(orgData.opportunityLeadStatuses || DEFAULT_OPPORTUNITY_LEAD_STATUSES)].sort((a, b) => a.order - b.order));
      setIsEditing(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 lg:p-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Pipeline Stages</h1>
          <p className="text-gray-500">Define the stages of your sales pipelines.</p>
        </div>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <Undo2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {mutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="leads" value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="leads">Lead Statuses</TabsTrigger>
          <TabsTrigger value="opportunities">Deals Lead Stages</TabsTrigger>
        </TabsList>
      </Tabs>

      <Alert className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-300">Pro Tip</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-400">
          Drag and drop statuses to change their order in your pipeline. System statuses are required for CRM automation but can be renamed.
        </AlertDescription>
      </Alert>

      <Card className="border-none shadow-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-indigo-500" /> 
              {activeTab === "leads" ? "Lead Status Pipeline" : "Deals Lead Pipeline"}
            </CardTitle>
          </div>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Status
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Reorder.Group 
            axis="y" 
            values={currentStatuses} 
            onReorder={handleReorder}
            className="divide-y divide-gray-100 dark:divide-gray-800"
          >
            {currentStatuses.map((status) => (
              <StatusItem 
                key={status.id} 
                status={status} 
                onEdit={() => setEditingStatus(status)}
                onDelete={() => handleDeleteStatus(status.id)}
                onSetDefault={() => handleSetDefault(status.id)}
              />
            ))}
          </Reorder.Group>
          {currentStatuses.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No custom statuses added yet. Click Add Status to create one.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Status Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Status</DialogTitle>
            <DialogDescription>Create a new stage for your pipeline workflow.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Status Label</Label>
              <Input id="label" name="label" placeholder="e.g. Demo Scheduled" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Badge Color</Label>
              <div className="flex gap-2 items-center">
                <Input id="color" name="color" type="color" defaultValue="#6366f1" className="w-12 h-10 p-1" />
                <span className="text-xs text-muted-foreground">Pick a color for the badge</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create Status</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>Update label and color for this stage.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Status Label</Label>
              <Input id="edit-label" name="label" defaultValue={editingStatus?.label} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-color">Badge Color</Label>
              <div className="flex gap-2 items-center">
                <Input id="edit-color" name="color" type="color" defaultValue={editingStatus?.color} className="w-12 h-10 p-1" />
                <span className="text-xs text-muted-foreground">This will update all leads with this status</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update Status</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusItem({ status, onEdit, onDelete, onSetDefault }: { 
  status: LeadStatus; 
  onEdit: () => void; 
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item 
      value={status}
      dragListener={false}
      dragControls={controls}
      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
    >
      <div 
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        onPointerDown={(e) => controls.start(e)}
      >
        <GripVertical className="h-5 w-5 text-gray-400" />
      </div>

      <div className="flex-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full shadow-sm" 
            style={{ backgroundColor: status.color }} 
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">{status.label}</span>
          {status.isSystem && (
            <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1 bg-gray-100 dark:bg-gray-800 text-gray-500 border-none">
              System
            </Badge>
          )}
          {status.isDefault && (
            <Badge variant="outline" className="text-[10px] font-bold py-0 px-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 animate-pulse">
              Default
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 ${status.isDefault ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
            onClick={onSetDefault}
            title={status.isDefault ? "Current Default" : "Set as Default"}
          >
            {status.isDefault ? <Star className="h-4 w-4 fill-amber-500" /> : <StarOff className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          {!status.isSystem && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Reorder.Item>
  );
}
