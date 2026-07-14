import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  Building,
  CreditCard,
  Shield,
  Search,
  MoreHorizontal,
  Database,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileJson,
  Trash2,
  ChevronRight,
  Bell
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { CreateOrganisationDialog } from '@/components/super-admin/CreateOrganisationDialog';
import { EditOrganisationDialog } from '@/components/super-admin/EditOrganisationDialog';
import { PlansManagement } from '@/components/super-admin/PlansManagement';
import { GlobalRolesManagement } from '@/components/super-admin/GlobalRolesManagement';
import { FAQManagement } from '@/components/super-admin/FAQManagement';
import { formatCurrency } from "@/lib/utils";
import { Globe } from 'lucide-react';

interface Organisation {
  id: string;
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'suspended';
  userCount: number;
  userLimit: number;
  createdAt: string;
  subscription?: {
    plan?: {
      id?: string;
      name: string;
    };
  };
  activeLicense?: {
    endDate: string;
    planId?: string;
    plan: {
      id: string;
      name: string;
      price: number;
      pricePerUser: number;
      pricingModel: 'flat_rate' | 'per_user';
      currency: string;
    };
  };
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Function to update URL when tab changes
  const onTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingOrg, setEditingOrg] = useState<Organisation | null>(null);
  const [isEditOrgOpen, setIsEditOrgOpen] = useState(false);

  // Fetch Stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const res = await api.get('/super-admin/stats');
      return res.data.overview;
    }
  });

  // Fetch Organisations
  const { data: organisations, isLoading: orgsLoading } = useQuery({
    queryKey: ['organisations'],
    queryFn: async () => {
      const res = await api.get('/super-admin/organisations');
      return res.data.organisations;
    }
  });

  // Suspend/Restore Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      // endpoint depends on action
      if (status === 'suspended') {
        // Restore
        await api.post(`/super-admin/organisations/${id}/restore`);
      } else {
        // Suspend
        await api.post(`/super-admin/organisations/${id}/suspend`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      toast.success('Organisation status updated');
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  });

  // Permanent Delete Mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/super-admin/organisations/${id}/permanent`, {
        data: { confirm: 'PERMANENTLY_DELETE' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organisations'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success(`Organisation permanently deleted: ${data.deletedData.users} users, ${data.deletedData.leads} leads, ${data.deletedData.products} products`);
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message || 'Failed to delete organisation');
    }
  });

  const handlePermanentDelete = (org: Organisation) => {
    const confirmed = window.confirm(
      `⚠️ PERMANENT DELETE WARNING ⚠️\n\n` +
      `This will PERMANENTLY delete "${org.name}" and ALL its data:\n` +
      `- All users in this organisation\n` +
      `- All leads\n` +
      `- All products\n` +
      `- All tasks and interactions\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type the organisation name to confirm: "${org.name}"`
    );

    if (confirmed) {
      const typedName = window.prompt(`Type "${org.name}" to confirm permanent deletion:`);
      if (typedName === org.name) {
        permanentDeleteMutation.mutate(org.id);
      } else {
        toast.error('Organisation name did not match. Deletion cancelled.');
      }
    }
  };

  const filteredOrgs = organisations?.filter((org: Organisation) =>
    (org.name?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (org.slug?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (org.contactEmail?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const handleBackup = async (org: Organisation) => {
    try {
      toast.loading('Generating backup...', { id: 'backup' });
      const response = await api.get(`/backup/${org.id}`, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${org.slug}-${new Date().toISOString().split('T')[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);

      toast.success('Backup downloaded successfully', { id: 'backup' });
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to generate backup', { id: 'backup' });
    }
  };

  return (
    <div className="p-8 space-y-8 bg-[#0f172a] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Platform overview and management</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="bg-[#1e1b4b] border border-indigo-900/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Overview</TabsTrigger>
          <TabsTrigger value="plans" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">License Plans</TabsTrigger>
          <TabsTrigger value="landing-page" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Landing Page</TabsTrigger>
          <TabsTrigger value="roles" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">System Roles</TabsTrigger>
          <TabsTrigger value="database" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Database</TabsTrigger>
          <TabsTrigger value="broadcast" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">Broadcast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          {/* Actions Bar for Overview */}
          <div className="flex justify-end">
            <CreateOrganisationDialog />
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-[#1e1b4b] border-indigo-900/50 hover:border-indigo-700/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Total Organisations
                </CardTitle>
                <Building className="h-4 w-4 text-indigo-400" />
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-8 w-20 bg-indigo-900/20" /> : (
                  <>
                    <div className="text-2xl font-bold text-white">{stats?.totalOrganisations}</div>
                    <p className="text-xs text-slate-400">
                      {stats?.activeOrganisations} active, {stats?.suspendedOrganisations} suspended
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#1e1b4b] border-indigo-900/50 hover:border-indigo-700/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-400" />
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-8 w-20 bg-indigo-900/20" /> : (
                  <div className="text-2xl font-bold text-white">{stats?.totalUsers}</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#1e1b4b] border-indigo-900/50 hover:border-indigo-700/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Active Licenses
                </CardTitle>
                <Shield className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-8 w-20 bg-indigo-900/20" /> : (
                  <div className="text-2xl font-bold text-white">{stats?.activeLicenses}</div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[#1e1b4b] border-indigo-900/50 hover:border-indigo-700/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-200">
                  Total Revenue
                </CardTitle>
                <CreditCard className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-8 w-20 bg-indigo-900/20" /> : (
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Organisations List */}
          <Card className="bg-[#1e1b4b] border-indigo-900/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Organisations</CardTitle>
                  <CardDescription className="text-slate-400">Manage platform tenants</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search organisations..."
                    className="pl-8 bg-[#0f172a] border-indigo-900/50 text-white placeholder:text-slate-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-indigo-800 hover:bg-indigo-900/30">
                    <TableHead className="text-slate-300">Organisation</TableHead>
                    <TableHead className="text-slate-300">Plan</TableHead>
                    <TableHead className="text-slate-300 text-center">Users</TableHead>
                    <TableHead className="text-slate-300">Expiry</TableHead>
                    <TableHead className="text-slate-300">Next Bill</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-right text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgsLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                        Loading organisations...
                      </TableCell>
                    </TableRow>
                  ) : filteredOrgs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-slate-400">
                        No organisations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrgs?.map((org: Organisation) => {
                      const daysLeft = org.activeLicense ? Math.ceil((new Date(org.activeLicense.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

                      const estBill = org.activeLicense ?
                        (org.activeLicense.plan.pricingModel === 'flat_rate' ?
                          org.activeLicense.plan.price :
                          (org.activeLicense.plan.price || 0) + (org.activeLicense.plan.pricePerUser || 0) * org.userCount)
                        : 0;

                      return (
                        <TableRow key={org.id} className="border-indigo-800/50 hover:bg-indigo-900/20">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-white">{org.name}</span>
                              <span className="text-[10px] text-slate-500">{org.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-indigo-700 text-indigo-300 text-[10px]">
                              {org.activeLicense?.plan.name || org.subscription?.plan?.name || 'Trial'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono text-slate-300">
                            {org.userCount || 0}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${daysLeft !== null && daysLeft < 5 ? 'text-red-400' : 'text-slate-300'}`}>
                                {daysLeft !== null ? `${daysLeft} days` : 'N/A'}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {org.activeLicense ? new Date(org.activeLicense.endDate).toLocaleDateString() : 'No active license'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-indigo-300 font-semibold text-xs">
                            {formatCurrency(estBill, org.activeLicense?.plan.currency || 'INR')}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={org.status === 'active' ? 'default' : 'destructive'}
                              className={org.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-emerald-500/30 text-[10px]'
                                : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-red-500/30 text-[10px]'}
                            >
                              {org.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-white">
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[#1e1b4b] border-indigo-800 text-slate-200">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/super-admin/organisation/${org.id}`)}
                                  className="hover:bg-indigo-800 focus:bg-indigo-800 cursor-pointer"
                                >
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingOrg(org);
                                    setIsEditOrgOpen(true);
                                  }}
                                  className="hover:bg-indigo-800 focus:bg-indigo-800 cursor-pointer text-indigo-300"
                                >
                                  Edit Organisation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-indigo-800" />
                                {org.status === 'active' ? (
                                  <DropdownMenuItem
                                    onClick={() => toggleStatusMutation.mutate({ id: org.id, status: 'active' })}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/30 focus:bg-red-900/30 cursor-pointer"
                                  >
                                    Suspend Organisation
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => toggleStatusMutation.mutate({ id: org.id, status: 'suspended' })}
                                    className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 focus:bg-emerald-900/30 cursor-pointer"
                                  >
                                    Restore Organisation
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator className="bg-indigo-800" />
                                <DropdownMenuItem
                                  onClick={() => handleBackup(org)}
                                  className="hover:bg-indigo-800 focus:bg-indigo-800 cursor-pointer text-blue-300"
                                >
                                  📥 Download Backup
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-indigo-800" />
                                <DropdownMenuItem
                                  onClick={() => handlePermanentDelete(org)}
                                  className="text-red-600 hover:text-red-400 hover:bg-red-950/50 focus:bg-red-950/50 cursor-pointer font-semibold"
                                >
                                  ⚠️ Permanent Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <PlansManagement />
        </TabsContent>

        <TabsContent value="landing-page">
          <FAQManagement />
        </TabsContent>

        <TabsContent value="roles">
          <GlobalRolesManagement />
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* ─── Platform Backup ─────────────────────────── */}
            <Card className="bg-[#1e1b4b] border-indigo-900/50 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Platform Export</CardTitle>
                    <CardDescription className="text-slate-400">
                      Download a complete backup of the entire platform.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-slate-300 mb-6">
                  This will generate a comprehensive <strong>.json</strong> file containing all organisations, users, leads, accounts, and configuration data.
                </p>
                <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 mb-6">
                  <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Backup Scope</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• 50+ Database Tables</li>
                    <li>• Global Roles & System Settings</li>
                    <li>• Organisation Hierarchy & Data</li>
                    <li>• Full Audit Logs & Statistics</li>
                  </ul>
                </div>
              </CardContent>
              <CardContent className="pt-0">
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 font-bold"
                  onClick={async () => {
                    try {
                      toast.loading('Generating platform backup...', { id: 'platform-backup' });
                      const response = await api.get('/super-admin/platform/export', { responseType: 'blob' });
                      
                      const url = window.URL.createObjectURL(new Blob([response.data]));
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `platform-full-backup-${new Date().toISOString().split('T')[0]}.json`);
                      document.body.appendChild(link);
                      link.click();
                      link.parentNode?.removeChild(link);
                      
                      toast.success('Platform backup downloaded', { id: 'platform-backup' });
                    } catch (error) {
                      toast.error('Export failed', { id: 'platform-backup' });
                    }
                  }}
                >
                  <FileJson className="mr-2 h-4 w-4" />
                  Generate Full Backup
                </Button>
              </CardContent>
            </Card>

            {/* ─── Platform Restore (Danger Zone) ──────────── */}
            <Card className="bg-[#1e1b4b] border-red-900/30 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1">
                <div className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-widest border-l border-b border-red-900/20">
                  Danger Zone
                </div>
              </div>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-white">Platform Restore</CardTitle>
                    <CardDescription className="text-slate-400">
                      Restore the entire system from a backup file.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4 mb-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                    <p className="text-xs text-red-200/70 leading-relaxed">
                      <strong>CRITICAL WARNING:</strong> This process will <strong>WIPE ALL CURRENT DATA</strong> from the database before importing the backup. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block">
                    <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-8 transition-all cursor-pointer bg-[#0f172a]/50 text-center">
                      <Upload className="h-8 w-8 text-slate-500 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-300">
                        Click to upload or drag & drop backup file
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">
                        Support for .json platform backups
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const backupData = JSON.parse(event.target?.result as string);
                            
                            // Safety checks
                            if (!backupData.tables || !backupData.version) {
                              toast.error('Invalid backup file format');
                              return;
                            }

                            const confirmText = prompt(`⚠️ FULL SYSTEM WIPE WARNING ⚠️\n\nThis will delete all current data and restore from the backup file.\n\nTo proceed, type exactly:\nPERMANENTLY_DELETE_ALL_DATA`);

                            if (confirmText === 'PERMANENTLY_DELETE_ALL_DATA') {
                              toast.loading('Performing system restoration... this may take a minute.', { id: 'restore' });
                              await api.post('/super-admin/platform/restore', { 
                                backupData, 
                                confirmDelete: confirmText 
                              });
                              toast.success('System restored successfully! Reloading...', { id: 'restore' });
                              setTimeout(() => window.location.reload(), 2000);
                            } else {
                              toast.error('Restoration cancelled. Confirmation string did not match.');
                            }
                          } catch (err) {
                            toast.error('Failed to parse backup file');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#1e1b4b] border-indigo-900/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-white">Database Viewer</CardTitle>
                  <CardDescription className="text-slate-400">
                    External tools for direct database management.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-[#0f172a] border border-indigo-900/50 rounded-xl p-5 group hover:border-indigo-500/30 transition-all">
                  <h4 className="text-white font-bold mb-1">Prisma Studio</h4>
                  <p className="text-xs text-slate-400 mb-4">Visual spreadsheet-like interface for your database tables.</p>
                  <Button
                    onClick={() => window.open('http://localhost:5555', '_blank')}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-xs h-9 justify-between pr-3"
                  >
                    <span>Open Prisma Studio (Local)</span>
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="bg-[#0f172a] border border-indigo-900/50 rounded-xl p-5">
                  <div className="flex gap-2 items-center mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h4 className="text-amber-400 font-bold text-sm">Security Note</h4>
                  </div>
                  <ul className="text-[10px] text-slate-500 space-y-1 mt-1 leading-relaxed">
                    <li>• Direct database access bypasses application logic.</li>
                    <li>• Use restoration tools for major environment syncs.</li>
                    <li>• Export daily to ensure data integrity during development.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="space-y-6">
          <Card className="bg-[#1e1b4b] border-indigo-900/50 shadow-2xl">
            <CardHeader className="border-b border-indigo-900/40 pb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Bell className="h-6 w-6 stroke-[1.5]" />
                </div>
                <div>
                  <CardTitle className="text-white text-xl">Platform Broadcast</CardTitle>
                  <CardDescription className="text-slate-400">
                    Send a persistent popup notification to all Organisation Administrators across the platform.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <SuperAdminBroadcastForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingOrg && (
        <EditOrganisationDialog
          open={isEditOrgOpen}
          onOpenChange={setIsEditOrgOpen}
          organisation={editingOrg}
        />
      )}
    </div>
  );
}

function SuperAdminBroadcastForm() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) {
      toast.error('Both title and message are required.');
      return;
    }

    try {
      setIsSending(true);
      const res = await api.post('/super-admin/broadcast-notification', { title, message });
      if (res.data?.success) {
        toast.success(res.data?.message || 'Broadcast sent successfully!');
        setTitle('');
        setMessage('');
      } else {
        toast.error('Failed to send broadcast');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'An error occurred.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Form Input fields */}
      <form onSubmit={handleSend} className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Broadcast Title</label>
          <Input
            placeholder="e.g. System Scheduled Maintenance"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="bg-[#0f172a] border-indigo-900/50 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300">Message Description</label>
          <textarea
            placeholder="Write your announcement details here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            className="w-full bg-[#0f172a] border border-indigo-900/50 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 resize-none min-h-[120px]"
          />
        </div>

        <Button
          type="submit"
          disabled={isSending || !title || !message}
          className="w-full h-11 text-sm font-semibold tracking-wide text-white rounded-xl shadow-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-indigo-600/20 disabled:opacity-50"
        >
          {isSending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Broadcasting Popup...
            </span>
          ) : (
            'Broadcast Announcement'
          )}
        </Button>
      </form>

      {/* Live Preview Area */}
      <div className="flex flex-col justify-start">
        <label className="text-sm font-semibold text-slate-300 mb-3">Real-time Pop-up Preview</label>
        <div className="relative border border-indigo-850 bg-slate-900/80 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center min-h-[220px] overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />
          <div className="h-10 w-10 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mb-3 animate-pulse">
            <Bell className="h-5 w-5" />
          </div>
          <h4 className="text-white font-bold text-base mb-1.5 line-clamp-1">
            {title || 'Your Announcement Title'}
          </h4>
          <p className="text-slate-400 text-xs text-center line-clamp-3 leading-relaxed max-w-sm px-2">
            {message || 'The detailed message of your popup broadcast announcement will appear here exactly as your users will see it in their premium non-dismissible dialog.'}
          </p>
          <div className="mt-5 w-full max-w-[140px] h-8 bg-indigo-600/25 border border-indigo-500/35 rounded-lg flex items-center justify-center text-[11px] font-semibold text-indigo-300">
            Mark as Read
          </div>
        </div>
      </div>
    </div>
  );
}
