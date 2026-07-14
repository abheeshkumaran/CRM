import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, MoreHorizontal, Loader2, ShieldCheck, ShieldAlert, Info, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Permission Registry ─────────────────────────────────────────────
interface PermissionModule {
  key: string;
  label: string;
  icon: string;
  actions: string[];
}

const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'users', label: 'Users', icon: '👤', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'leads', label: 'Leads', icon: '🎯', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'contacts', label: 'Contacts', icon: '📇', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'accounts', label: 'Accounts', icon: '🏢', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'opportunities', label: 'Opportunities', icon: '💰', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'reports', label: 'Reports', icon: '📊', actions: ['read', 'create'] },
  { key: 'settings', label: 'Settings', icon: '⚙️', actions: ['read', 'update'] },
  { key: 'team', label: 'Team', icon: '👥', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'campaigns', label: 'Campaigns', icon: '📣', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'email-lists', label: 'Email Lists', icon: '📧', actions: ['read', 'create', 'update', 'delete'] },
];

const ACTION_LABELS: Record<string, string> = {
  read: 'Read',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
};

// ─── Conversion helpers ──────────────────────────────────────────────
type PermState = Record<string, Set<string>>;

function permissionsToState(permissions: string[]): { state: PermState; isSuperAdmin: boolean } {
  if (permissions.includes('*')) {
    // Super admin — select everything
    const state: PermState = {};
    PERMISSION_MODULES.forEach(mod => {
      state[mod.key] = new Set([...mod.actions, '*']);
    });
    return { state, isSuperAdmin: true };
  }

  const state: PermState = {};
  PERMISSION_MODULES.forEach(mod => {
    state[mod.key] = new Set<string>();
  });

  permissions.forEach(perm => {
    const [module, action] = perm.split(':');
    if (state[module] !== undefined) {
      if (action === '*') {
        const mod = PERMISSION_MODULES.find(m => m.key === module);
        if (mod) {
          state[module] = new Set([...mod.actions, '*']);
        }
      } else {
        state[module].add(action);
      }
    }
  });

  return { state, isSuperAdmin: false };
}

function stateToPermissions(state: PermState, isSuperAdmin: boolean): string[] {
  if (isSuperAdmin) return ['*'];

  const result: string[] = [];
  Object.entries(state).forEach(([module, actions]) => {
    if (actions.has('*')) {
      result.push(`${module}:*`);
    } else {
      actions.forEach(action => {
        if (action !== '*') result.push(`${module}:${action}`);
      });
    }
  });
  return result;
}

// ─── Main Component ──────────────────────────────────────────────────
interface Role {
  id: string;
  roleKey: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
}

export function GlobalRolesManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['global-roles'],
    queryFn: async () => {
      const res = await api.get('/super-admin/roles');
      return res.data.roles;
    }
  });

  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.post('/super-admin/roles', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-roles'] });
      toast.success('Global role updated successfully');
      setIsCreateOpen(false);
      setEditingRole(null);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Failed to update global role')
  });

  /** Summarise a permissions array as a short label */
  const permSummary = (permissions: string[]) => {
    if (permissions.includes('*')) return <Badge className="bg-amber-500/20 text-amber-300 border-amber-600/40 text-[10px]"><ShieldAlert className="h-3 w-3 mr-1" />Full System Access</Badge>;
    const count = permissions.length;
    return <span className="text-slate-400 text-xs">{count} permission{count !== 1 ? 's' : ''}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Global Role Templates</h2>
          <p className="text-slate-400 text-sm">System-wide role definitions that organisations can use or override.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Create Global Role
        </Button>
      </div>

      <div className="rounded-md border border-indigo-900/50 bg-[#1e1b4b]">
        <Table>
          <TableHeader>
            <TableRow className="border-indigo-800 hover:bg-indigo-900/30">
              <TableHead className="text-slate-300">Role Name</TableHead>
              <TableHead className="text-slate-300">Key</TableHead>
              <TableHead className="text-slate-300">Permissions</TableHead>
              <TableHead className="text-slate-300">Type</TableHead>
              <TableHead className="text-right text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-400">Loading...</TableCell>
              </TableRow>
            ) : roles?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-400">No global roles found</TableCell>
              </TableRow>
            ) : (
              roles?.map((role: Role) => (
                <TableRow key={role.id} className="border-indigo-800/50 hover:bg-indigo-900/20">
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-400" />
                      {role.name}
                    </div>
                    {role.description && <div className="text-xs text-slate-400 ml-6">{role.description}</div>}
                  </TableCell>
                  <TableCell className="text-slate-400 font-mono text-xs">{role.roleKey}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 items-center">
                      {role.permissions.includes('*') ? (
                        permSummary(role.permissions)
                      ) : (
                        <>
                          {role.permissions.slice(0, 4).map((p, i) => (
                            <Badge key={i} variant="secondary" className="bg-indigo-900/50 text-indigo-300 text-[10px] border-indigo-700/50">
                              {p}
                            </Badge>
                          ))}
                          {role.permissions.length > 4 && (
                            <Badge variant="secondary" className="bg-indigo-900/50 text-indigo-300 text-[10px] border-indigo-700/50">
                              +{role.permissions.length - 4} more
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isSystemRole ? 'outline' : 'default'} className={role.isSystemRole ? 'border-indigo-700 text-indigo-300' : 'bg-indigo-600'}>
                      {role.isSystemRole ? 'System' : 'Custom'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1e1b4b] border-indigo-800 text-slate-200">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setEditingRole(role)} className="cursor-pointer hover:bg-indigo-800">
                          Edit Template
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Card className="bg-indigo-950/20 border-indigo-900/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
            <Info className="h-4 w-4" /> About Global Roles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-slate-400 leading-relaxed">
            Global roles serve as templates. When a new organisation is created, it inherits these roles.
            Organisation admins can override these templates with custom names or permissions for their specific needs.
            Changes to global roles will NOT automatically propagate to existing organisation overrides.
          </p>
        </CardContent>
      </Card>

      <RoleDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(data) => upsertMutation.mutate(data)}
        isLoading={upsertMutation.isPending}
        mode="create"
      />

      {editingRole && (
        <RoleDialog
          open={!!editingRole}
          onOpenChange={(open) => !open && setEditingRole(null)}
          onSubmit={(data) => upsertMutation.mutate(data)}
          isLoading={upsertMutation.isPending}
          initialData={editingRole}
          mode="edit"
        />
      )}
    </div>
  );
}

// ─── Permission Matrix ───────────────────────────────────────────────
function PermissionMatrix({
  permState,
  setPermState,
  isSuperAdmin,
  setIsSuperAdmin,
}: {
  permState: PermState;
  setPermState: React.Dispatch<React.SetStateAction<PermState>>;
  isSuperAdmin: boolean;
  setIsSuperAdmin: (v: boolean) => void;
}) {
  const toggleSuperAdmin = useCallback((checked: boolean) => {
    setIsSuperAdmin(checked);
    if (checked) {
      const newState: PermState = {};
      PERMISSION_MODULES.forEach(mod => {
        newState[mod.key] = new Set([...mod.actions, '*']);
      });
      setPermState(newState);
    } else {
      const newState: PermState = {};
      PERMISSION_MODULES.forEach(mod => {
        newState[mod.key] = new Set<string>();
      });
      setPermState(newState);
    }
  }, [setPermState, setIsSuperAdmin]);

  const toggleModuleFull = useCallback((moduleKey: string, checked: boolean) => {
    setPermState(prev => {
      const next = { ...prev };
      const mod = PERMISSION_MODULES.find(m => m.key === moduleKey)!;
      if (checked) {
        next[moduleKey] = new Set([...mod.actions, '*']);
      } else {
        next[moduleKey] = new Set<string>();
      }
      return next;
    });
  }, [setPermState]);

  const toggleAction = useCallback((moduleKey: string, action: string, checked: boolean) => {
    setPermState(prev => {
      const next = { ...prev };
      const current = new Set(prev[moduleKey]);
      if (checked) {
        current.add(action);
        // Check if all actions are now selected → auto-set *
        const mod = PERMISSION_MODULES.find(m => m.key === moduleKey)!;
        if (mod.actions.every(a => current.has(a))) {
          current.add('*');
        }
      } else {
        current.delete(action);
        current.delete('*');
      }
      next[moduleKey] = current;
      return next;
    });
  }, [setPermState]);

  const allActions = ['read', 'create', 'update', 'delete'];

  return (
    <div className="space-y-4">
      {/* Super Admin toggle */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-600/20">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Full System Access</p>
            <p className="text-[10px] text-amber-400/70">Grants unrestricted access to all modules and actions</p>
          </div>
        </div>
        <Switch
          checked={isSuperAdmin}
          onCheckedChange={toggleSuperAdmin}
          className="data-[state=checked]:bg-amber-500"
        />
      </div>

      {/* Module grid */}
      <ScrollArea className="h-[380px] pr-2">
        <div className="rounded-lg border border-indigo-900/50 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[200px_repeat(4,1fr)_80px] bg-indigo-950/60 border-b border-indigo-900/50 px-3 py-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Module</div>
            {allActions.map(a => (
              <div key={a} className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">{ACTION_LABELS[a]}</div>
            ))}
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Full</div>
          </div>

          {/* Rows */}
          {PERMISSION_MODULES.map((mod, idx) => {
            const modFull = permState[mod.key]?.has('*') || false;
            return (
              <div
                key={mod.key}
                className={`grid grid-cols-[200px_repeat(4,1fr)_80px] items-center px-3 py-2.5 transition-colors
                  ${idx % 2 === 0 ? 'bg-indigo-950/20' : 'bg-indigo-950/40'}
                  ${modFull ? 'bg-indigo-900/25' : ''}
                  hover:bg-indigo-900/30`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{mod.icon}</span>
                  <span className="text-sm font-medium text-slate-200">{mod.label}</span>
                </div>
                {allActions.map(action => {
                  const supported = mod.actions.includes(action);
                  const checked = permState[mod.key]?.has(action) || false;
                  return (
                    <div key={action} className="flex justify-center">
                      {supported ? (
                        <Checkbox
                          checked={checked || isSuperAdmin}
                          disabled={isSuperAdmin}
                          onCheckedChange={(c) => toggleAction(mod.key, action, !!c)}
                          className="border-indigo-600 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 disabled:opacity-40"
                        />
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </div>
                  );
                })}
                <div className="flex justify-center">
                  <Checkbox
                    checked={modFull || isSuperAdmin}
                    disabled={isSuperAdmin}
                    onCheckedChange={(c) => toggleModuleFull(mod.key, !!c)}
                    className="border-emerald-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 disabled:opacity-40"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Permission count */}
      {!isSuperAdmin && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Check className="h-3 w-3" />
          {stateToPermissions(permState, false).length} permission(s) selected
        </div>
      )}
    </div>
  );
}

// ─── Role Dialog (Create / Edit) ─────────────────────────────────────
function RoleDialog({ open, onOpenChange, onSubmit, isLoading, initialData, mode }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
  initialData?: Role;
  mode: 'create' | 'edit';
}) {
  const [roleKey, setRoleKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permState, setPermState] = useState<PermState>({});
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize state when dialog opens / initialData changes
  useEffect(() => {
    if (initialData) {
      setRoleKey(initialData.roleKey);
      setName(initialData.name);
      setDescription(initialData.description || '');
      const { state, isSuperAdmin: sa } = permissionsToState(initialData.permissions);
      setPermState(state);
      setIsSuperAdmin(sa);
    } else {
      setRoleKey('');
      setName('');
      setDescription('');
      const emptyState: PermState = {};
      PERMISSION_MODULES.forEach(m => { emptyState[m.key] = new Set<string>(); });
      setPermState(emptyState);
      setIsSuperAdmin(false);
    }
    setErrors({});
  }, [initialData, open]);

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!roleKey.trim()) errs.roleKey = 'Key is required';
    if (!name.trim()) errs.name = 'Name is required';
    const permissions = stateToPermissions(permState, isSuperAdmin);
    if (permissions.length === 0) errs.permissions = 'At least one permission is required';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({
      roleKey,
      name,
      description,
      permissions,
      isSystemRole: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] bg-[#0f172a] border-indigo-900/50 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Global Role Template' : 'Edit Global Role Template'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Define a platform-wide role template with granular permissions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role Key (Immutable ID)</Label>
              <Input
                value={roleKey}
                onChange={(e) => { setRoleKey(e.target.value); setErrors(prev => ({ ...prev, roleKey: '' })); }}
                placeholder="e.g. sales_manager"
                className="bg-[#1e1b4b] border-indigo-900/50 text-white"
                disabled={mode === 'edit'}
              />
              {errors.roleKey && <span className="text-red-400 text-xs">{errors.roleKey}</span>}
            </div>
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
                placeholder="e.g. Sales Manager"
                className="bg-[#1e1b4b] border-indigo-900/50 text-white"
              />
              {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief role description"
              className="bg-[#1e1b4b] border-indigo-900/50 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Permissions</Label>
            <PermissionMatrix
              permState={permState}
              setPermState={setPermState}
              isSuperAdmin={isSuperAdmin}
              setIsSuperAdmin={setIsSuperAdmin}
            />
            {errors.permissions && <span className="text-red-400 text-xs">{errors.permissions}</span>}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create Template' : 'Update Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
