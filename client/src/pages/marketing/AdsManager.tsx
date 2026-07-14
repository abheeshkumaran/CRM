import React, { useState, useEffect } from 'react';
import { getAdAccounts, getMetaCampaigns, createMetaCampaign, getAccountInsights, getCampaignInsights, type Campaign, type AdInsight } from '../../services/marketingService';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Eye, MousePointerClick, DollarSign, Target, TrendingUp, Users, BarChart3, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getOrganisation } from '../../services/settingsService';
import { useNavigate } from 'react-router-dom';

const AdsManager: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: organisation } = useQuery({
    queryKey: ['organisation'],
    queryFn: getOrganisation
  });
  const [adAccounts, setAdAccounts] = useState<{ id: string; name: string; account_id: string }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [metaConnected, setMetaConnected] = useState(true);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', objective: 'OUTCOME_LEADS' });

  // Analytics state
  const [accountInsights, setAccountInsights] = useState<AdInsight | null>(null);
  const [campaignInsights, setCampaignInsights] = useState<AdInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);

  useEffect(() => {
    fetchAdAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchCampaigns(selectedAccount);
      fetchInsights();
    }
  }, [selectedAccount]);

  const fetchAdAccounts = async () => {
    try {
      const res = await getAdAccounts();
      if (res.code === 'META_NOT_CONNECTED') {
        setMetaConnected(false);
        return;
      }
      if (res.data && res.data.data) {
        setAdAccounts(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedAccount(res.data.data[0].id);
        }
      } else if (res.data) {
        const accounts = Array.isArray(res.data) ? res.data : res.data.data || [];
        setAdAccounts(accounts);
        if (accounts.length > 0) {
          setSelectedAccount(accounts[0].id);
        }
      }
      setMetaConnected(true);
      setTokenExpired(false);
    } catch (error: unknown) {
      const err = error as { response?: { status: number; data?: { code?: string } } };
      if (err.response?.status === 401 || err.response?.data?.code === 'META_TOKEN_EXPIRED') {
        setTokenExpired(true);
      } else if (err.response?.status === 400 && err.response?.data?.code === 'META_NOT_CONNECTED') {
        setMetaConnected(false);
      } else {
        console.error('Failed to fetch ad accounts', error);
        toast.error('Failed to load Ad Accounts.');
      }
    }
  };

  const fetchCampaigns = async (accountId: string) => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await getMetaCampaigns(accountId);
      setCampaigns(res.data || res || []);
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    setInsightsLoading(true);
    try {
      const [acctData, campData] = await Promise.all([
        getAccountInsights().catch(() => null),
        getCampaignInsights().catch(() => [])
      ]);

      if (acctData && !acctData.error) {
        const insights = Array.isArray(acctData) ? acctData[0] : acctData;
        setAccountInsights(insights || null);
      }

      if (campData && !campData.error) {
        const campInsights = Array.isArray(campData) ? campData : campData.data || [];
        setCampaignInsights(campInsights);
      }
    } catch (error) {
      console.error('Failed to fetch insights', error);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!selectedAccount) return;
    try {
      await createMetaCampaign(selectedAccount, {
        name: newCampaign.name,
        objective: newCampaign.objective,
        status: 'PAUSED',
        special_ad_categories: []
      } as Partial<Campaign> & Record<string, unknown>);
      toast.success('Campaign Created Successfully!');
      fetchCampaigns(selectedAccount);
      setNewCampaign({ name: '', objective: 'OUTCOME_LEADS' });
      setShowCreateForm(false);
    } catch {
      toast.error('Failed to create campaign');
    }
  };

  const handleToggleLeadSync = async (accountId: string, enabled: boolean) => {
    try {
      const { updateOrganisation } = await import('../../services/settingsService');
      const currentIntegrations = (organisation?.integrations as any) || {};
      const meta = currentIntegrations.meta || {};
      const enabledAccounts = [...(meta.enabledLeadSyncAccounts || [])];

      let newEnabledAccounts;
      if (enabled) {
        if (!enabledAccounts.includes(accountId)) {
          newEnabledAccounts = [...enabledAccounts, accountId];
        } else {
          newEnabledAccounts = enabledAccounts;
        }
      } else {
        newEnabledAccounts = enabledAccounts.filter(id => id !== accountId);
      }

      await updateOrganisation({
        integrations: {
          ...currentIntegrations,
          meta: {
            ...meta,
            enabledLeadSyncAccounts: newEnabledAccounts
          }
        }
      });
      
      queryClient.invalidateQueries({ queryKey: ['organisation'] });
      toast.success(enabled ? 'Lead sync enabled for this account' : 'Lead sync disabled for this account');
    } catch (error) {
      console.error('Failed to update lead sync settings', error);
      toast.error('Failed to update sync settings');
    }
  };

  const formatNumber = (val: string | number | undefined) => {
    if (!val) return '0';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (val: string | number | undefined) => {
    if (!val) return '$0.00';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `$${num.toFixed(2)}`;
  };

  const formatPercent = (val: string | number | undefined) => {
    if (!val) return '0.00%';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return `${num.toFixed(2)}%`;
  };

  const getLeadCount = (actions?: { action_type: string; value: string }[]) => {
    if (!actions) return '0';
    const leadAction = actions.find(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped');
    return leadAction?.value || '0';
  };

  const getCampaignInsight = (campaignId: string): AdInsight | undefined => {
    return campaignInsights.find(i => i.campaign_id === campaignId);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'PAUSED': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ads Manager</h1>
          <p className="text-muted-foreground mt-1">Monitor and sync your Facebook ad campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={insightsLoading}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${insightsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a href="https://adsmanager.facebook.com" target="_blank" rel="noreferrer">
            <Button variant="default">
              Open Meta Ads Manager
            </Button>
          </a>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3" role="alert">
        <div className="bg-blue-100 dark:bg-blue-800 p-1 rounded-full mt-0.5">
          <Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        </div>
        <div>
          <p className="font-semibold text-blue-800 dark:text-blue-300">Campaign Management</p>
          <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
            Campaigns and ads are now managed directly in your <strong>Meta Ads Manager</strong> account. 
            Incoming leads will automatically sync to your CRM leads list.
          </p>
        </div>
      </div>

      {!metaConnected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4" role="alert">
          <p className="font-semibold text-yellow-800 dark:text-yellow-300">Meta Account Not Connected</p>
          <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">Please connect your Facebook account in Settings → Integrations to manage ads.</p>
        </div>
      )}

      {tokenExpired && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between" role="alert">
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">Meta Connection Expired</p>
            <p className="text-red-700 dark:text-red-400 text-sm mt-1">Your Meta access token has expired or been revoked. Please reconnect to continue managing ads.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={() => navigate('/settings/integrations')}>
            Reconnect Now
          </Button>
        </div>
      )}

      {/* Connection Info / Notice */}
      {metaConnected && (
        <div className="flex flex-col gap-2">
          {organisation?.integrations?.facebook_payload?.connected && organisation?.integrations?.facebook_payload?.connectionMode === 'webhook' && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Push-only Webhook Active
              </p>
              <p className="text-indigo-700 dark:text-indigo-400 text-sm mt-1">
                You are currently using the <strong>Direct Webhook URL</strong> to receive leads. 
                In this mode, real-time analytics like reach and impressions are not available because no Meta Access Token is provided. 
                <br />
                <Button variant="link" className="p-0 h-auto text-xs text-indigo-600 underline" onClick={() => navigate('/settings/integrations')}>
                  Switch to API Sync to see analytics
                </Button>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Account Selector & Sync Toggle */}
      {metaConnected && (
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="w-full max-w-sm">
            <Label className="text-sm font-medium mb-1.5 block">Ad Account</Label>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="bg-white dark:bg-gray-900">
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent>
                {adAccounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAccount && (
            <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border rounded-lg px-4 h-10">
              <span className="text-sm font-medium">Auto-Sync Leads</span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sync-toggle"
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={(organisation?.integrations as any)?.meta?.enabledLeadSyncAccounts?.includes(selectedAccount) || false}
                  onChange={(e) => handleToggleLeadSync(selectedAccount, e.target.checked)}
                />
                <Label htmlFor="sync-toggle" className="text-xs text-muted-foreground cursor-pointer">
                  {(organisation?.integrations as any)?.meta?.enabledLeadSyncAccounts?.includes(selectedAccount) ? 'Enabled' : 'Disabled'}
                </Label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= ANALYTICS OVERVIEW ============= */}
      {metaConnected && accountInsights && (organisation?.integrations?.facebook_payload?.connectionMode !== 'webhook' || organisation?.integrations?.meta?.connected) && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Account Performance (Last 30 Days)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Impressions</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatNumber(accountInsights.impressions)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">Reach</span>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatNumber(accountInsights.reach)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/40 dark:to-purple-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointerClick className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Clicks</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{formatNumber(accountInsights.clicks)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/40 dark:to-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">CTR</span>
                </div>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatPercent(accountInsights.ctr)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Spend</span>
                </div>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(accountInsights.spend)}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950/40 dark:to-teal-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-teal-600" />
                  <span className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-wide">Leads</span>
                </div>
                <p className="text-2xl font-bold text-teal-900 dark:text-teal-100">{getLeadCount(accountInsights.actions)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary metrics row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Cost per Click</p>
              <p className="text-lg font-semibold">{formatCurrency(accountInsights.cpc)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">CPM</p>
              <p className="text-lg font-semibold">{formatCurrency(accountInsights.cpm)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Unique Clicks</p>
              <p className="text-lg font-semibold">{formatNumber(accountInsights.unique_clicks)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border">
              <p className="text-xs text-muted-foreground">Date Range</p>
              <p className="text-sm font-medium">{accountInsights.date_start} – {accountInsights.date_stop}</p>
            </div>
          </div>
        </div>
      )}

      {/* Insights Loading State */}
      {metaConnected && insightsLoading && !accountInsights && (
        <div className="flex justify-center items-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </div>
      )}

      {/* Create Campaign Form */}
      {showCreateForm && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Create New Campaign</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  placeholder="e.g. Summer Sale 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Objective</Label>
                <Select
                  value={newCampaign.objective}
                  onValueChange={(val) => setNewCampaign({ ...newCampaign, objective: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                    <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                    <SelectItem value="OUTCOME_SALES">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreateCampaign} disabled={!newCampaign.name || loading}>
              {loading ? 'Processing...' : 'Create Campaign'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ============= CAMPAIGNS WITH INSIGHTS ============= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Campaigns</CardTitle>
          <Badge variant="secondary">{campaigns.length} total</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No campaigns found.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((camp) => {
                const insight = getCampaignInsight(camp.id);
                const isExpanded = expandedCampaign === camp.id;

                return (
                  <div
                    key={camp.id}
                    className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-white dark:bg-gray-900"
                  >
                    {/* Campaign Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setExpandedCampaign(isExpanded ? null : camp.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{camp.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">ID: {camp.id}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Quick stats inline */}
                        {insight && (
                          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground mr-4">
                            <span title="Impressions">👁 {formatNumber(insight.impressions)}</span>
                            <span title="Clicks">🖱 {formatNumber(insight.clicks)}</span>
                            <span title="Spend">💰 {formatCurrency(insight.spend)}</span>
                            <span title="CTR">📊 {formatPercent(insight.ctr)}</span>
                          </div>
                        )}

                        <Badge className={getStatusColor(camp.status)}>
                          {camp.status}
                        </Badge>

                        <Badge variant="outline" className="hidden sm:inline-flex">
                          {camp.objective?.replace('OUTCOME_', '') || 'N/A'}
                        </Badge>

                        {insight ? (
                          isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : null}
                      </div>
                    </div>

                    {/* Expanded Campaign Insights */}
                    {isExpanded && insight && (
                      <div className="border-t bg-gray-50 dark:bg-gray-950/50 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Impressions</p>
                            <p className="text-lg font-bold mt-1">{formatNumber(insight.impressions)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Reach</p>
                            <p className="text-lg font-bold mt-1">{formatNumber(insight.reach)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Clicks</p>
                            <p className="text-lg font-bold mt-1">{formatNumber(insight.clicks)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CTR</p>
                            <p className="text-lg font-bold mt-1">{formatPercent(insight.ctr)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Spend</p>
                            <p className="text-lg font-bold mt-1">{formatCurrency(insight.spend)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CPC</p>
                            <p className="text-lg font-bold mt-1">{formatCurrency(insight.cpc)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">CPM</p>
                            <p className="text-lg font-bold mt-1">{formatCurrency(insight.cpm)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Unique Clicks</p>
                            <p className="text-lg font-bold mt-1">{formatNumber(insight.unique_clicks)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Leads</p>
                            <p className="text-lg font-bold mt-1">{getLeadCount(insight.actions)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Period</p>
                            <p className="text-sm font-medium mt-1">{insight.date_start} – {insight.date_stop}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdsManager;
