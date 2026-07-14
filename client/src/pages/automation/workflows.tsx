
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getWorkflows, runWorkflow, deleteWorkflow, type Workflow, type WorkflowCondition, type WorkflowAction } from '@/services/workflowService';
import { getLeads, type Lead } from '@/services/leadService';
import { toast } from 'sonner';
import { AxiosError } from 'axios';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Filter,
  Mail,
  Plus,
  Play,
  CheckCircle2,
  GitBranch,
  MousePointerClick,
  Users,
  Search,
  GripVertical,
  Trash2,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function WorkflowsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => getWorkflows({}),
  });

  const { data: leadsData } = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads(),
  });

  const leads = leadsData?.leads || [];
  const filteredLeads = leads.filter((l: Lead) =>
    l.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const runMutation = useMutation({
    mutationFn: async ({ workflowId, leadId }: { workflowId: string, leadId: string }) => {
      return runWorkflow(workflowId, leadId);
    },
    onSuccess: () => {
      toast.success('Workflow executed successfully');
    },
    onError: (err: unknown) => {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message || 'Failed to execute workflow');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow deleted successfully');
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
      // If the deleted workflow was selected, clear selection
      if (selectedId === workflowToDelete) {
        setSelectedId(null);
      }
    },
    onError: (err: unknown) => {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message || 'Failed to delete workflow');
    }
  });

  const handleDeleteClick = (workflowId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkflowToDelete(workflowId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (workflowToDelete) {
      deleteMutation.mutate(workflowToDelete);
    }
  };

  const workflows = useMemo(() => data?.workflows || [], [data]);
  const selectedWorkflow = workflows.find((w: Workflow) => w.id === selectedId) || workflows[0];

  // Auto-select first if none selected
  useEffect(() => {
    if (!selectedId && workflows.length > 0) {
      const timer = setTimeout(() => setSelectedId(workflows[0].id), 0);
      return () => clearTimeout(timer);
    }
  }, [selectedId, workflows]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');

    if (leadId && selectedId) {
      runMutation.mutate({ workflowId: selectedId, leadId });
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="flex h-full overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Workflows List Sidebar */}
      <div className="w-64 border-r bg-card flex flex-col z-20 shadow-sm">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">Workflows</h2>
            <Link to="/automation/new">
              <Button size="icon" variant="ghost" className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-2">
            {isLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No workflows found.
              </div>
            ) : (
              workflows.map((workflow: Workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => setSelectedId(workflow.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm group ${selectedId === workflow.id
                    ? 'bg-primary/5 border-primary ring-1 ring-primary'
                    : 'bg-card border-border hover:bg-muted/50'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-md ${workflow.isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        <GitBranch className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-sm truncate">{workflow.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {workflow.isActive && <div className="h-2 w-2 rounded-full bg-green-500" />}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/automation/${workflow.id}`} className="cursor-pointer">
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => handleDeleteClick(workflow.id, e)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Leads Sidebar (Draggable Source) */}
      <div className="w-72 border-r bg-gray-50/50 dark:bg-gray-900/50 flex flex-col border-l order-first lg:order-none">
        <div className="p-4 border-b bg-white dark:bg-gray-900">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Available Leads
          </h3>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-8 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredLeads.map((lead: Lead) => (
            <div
              key={lead.id}
              draggable
              onDragStart={(e) => handleDragStart(e, lead.id)}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-600 group"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium truncate w-40">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate w-40">
                    {lead.email}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {filteredLeads.length === 0 && (
            <div className="text-center p-8 text-sm text-muted-foreground">
              No leads found
            </div>
          )}
        </div>
      </div>

      {/* Main Visual Canvas */}
      <div
        className={`flex-1 flex flex-col bg-muted/20 relative overflow-hidden transition-colors ${draggedLeadId ? 'bg-primary/5 border-2 border-dashed border-primary/50 m-2 rounded-xl' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Canvas Header */}
        <div className="h-16 border-b bg-background/80 backdrop-blur w-full flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{selectedWorkflow?.name || 'Select Workflow'}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className={selectedWorkflow?.isActive ? "text-green-600" : "text-gray-500"}>
                  {selectedWorkflow?.isActive ? 'Active' : 'Inactive'}
                </span>
                <span>•</span>
                Last run: {selectedWorkflow?.lastExecutedAt ? new Date(selectedWorkflow.lastExecutedAt).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draggedLeadId && (
              <div className="mr-4 text-sm font-medium text-blue-600 animate-pulse">
                Drop to run workflow
              </div>
            )}
            <Link to={selectedId ? `/automation/${selectedId}` : '#'}>
              <Button variant="outline" size="sm" disabled={!selectedId}>
                Edit Workflow
              </Button>
            </Link>
          </div>
        </div>

        {/* Flowchart Area */}
        <div className="flex-1 overflow-auto p-10 flex justify-center">
          {selectedWorkflow ? (
            <div className="max-w-2xl w-full flex flex-col items-center space-y-8 pb-20">

              {/* Start Node */}
              <div className="flex flex-col items-center group">
                <div className="w-64 p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-indigo-100 dark:border-indigo-900 shadow-sm transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md relative z-10">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-indigo-500 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center">
                    <Play className="h-2 w-2 text-white fill-current" />
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">TRIGGER</p>
                    <h3 className="font-medium text-sm">When {selectedWorkflow.triggerEntity} is {selectedWorkflow.triggerEvent}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Starts the automation sequence</p>
                  </div>
                </div>
                {/* Connector */}
                <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 my-1 group-hover:bg-indigo-300 transition-colors"></div>
                <div className="h-2 w-2 rotated-45 border-b border-r border-gray-300 dark:border-gray-700 group-hover:border-indigo-300 -mt-2 transform rotate-45 bg-white dark:bg-gray-950"></div>
              </div>

              {/* Conditions Node (Optional) */}
              {selectedWorkflow.conditions && selectedWorkflow.conditions.length > 0 ? (
                <div className="flex flex-col items-center group w-full">
                  <div className="w-64 p-3 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-orange-300 dark:border-orange-800 relative z-10 flex flex-col gap-2">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 px-2 py-0.5 rounded text-[10px] font-medium border border-orange-200 dark:border-orange-800">
                      IF CONDITIONS MET
                    </div>
                    {selectedWorkflow.conditions.map((cond: WorkflowCondition, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-orange-50 dark:bg-orange-950/20 rounded">
                        <Filter className="h-3 w-3 text-orange-500" />
                        <span className="font-medium">{cond.field}</span>
                        <span className="text-muted-foreground text-xs">{cond.operator}</span>
                        <span className="font-medium">"{String(cond.value)}"</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-8 w-px bg-gray-300 dark:bg-gray-700 my-1"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center opacity-50">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-1 text-xs text-muted-foreground mb-2">No filter conditions</div>
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                </div>
              )}

              {/* Actions List */}
              <div className="w-full flex flex-col items-center gap-4">
                {selectedWorkflow.actions && selectedWorkflow.actions.length > 0 ? (
                  selectedWorkflow.actions.map((action: WorkflowAction, index: number) => (
                    <div key={index} className="flex flex-col items-center w-full group">
                      <div className="w-64 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm relative z-10 hover:border-green-400 dark:hover:border-green-600 transition-colors">
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-green-500 rounded-full border-4 border-white dark:border-gray-900 flex items-center justify-center text-white">
                          <span className="text-[10px] font-bold">{index + 1}</span>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {action.type === 'send_email' ? <Mail className="h-4 w-4 text-purple-500" /> :
                              action.type === 'create_task' ? <CheckCircle2 className="h-4 w-4 text-blue-500" /> :
                                <MousePointerClick className="h-4 w-4 text-gray-500" />}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium capitalize">{action.type.replace('_', ' ')}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">
                              {action.type === 'send_email' ? `To: ${action.config?.to || 'Lead Email'}` :
                                action.type === 'create_task' ? `Task: ${action.config?.subject}` : 'Execute Action'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Line to next action or end */}
                      {index < selectedWorkflow.actions.length - 1 && (
                        <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 my-1"></div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground bg-gray-50 dark:bg-gray-900/50">
                    No actions defined
                  </div>
                )}
              </div>

              {/* End Node */}
              <div className="mt-4 flex flex-col items-center opacity-50">
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-700"></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                <span className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">End</span>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Zap className="h-16 w-16 mb-4 opacity-10" />
              <p>Select a workflow from the sidebar to visualize it.</p>
            </div>
          )}
        </div>

        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] bg-[length:24px_24px]">
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setWorkflowToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

