import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Layout from './components/shared/Layout';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import SharedProductPage from './pages/public/SharedProductPage';
import LandingPageView from './pages/public/LandingPageView';
import { PageLoader } from './components/ui/page-loader';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import SSOCallback from './pages/SSOCallback';

// Lazy load secondary pages
const LeadsPage = lazy(() => import('./pages/leads'));
const CreateLeadPage = lazy(() => import('./pages/leads/new'));
const LeadDetailPage = lazy(() => import('./pages/leads/[id]'));
const BulkImportLeadsPage = lazy(() => import('./pages/leads/import'));
const ReEnquiriesPage = lazy(() => import('./pages/re-enquiries'));
const DuplicatesPage = lazy(() => import('./pages/duplicates'));
const UserProfilePage = lazy(() => import('./pages/users/[id]'));
const ContactsPage = lazy(() => import('./pages/contacts'));
const ContactDetailPage = lazy(() => import('./pages/contacts/[id]'));
const AccountsPage = lazy(() => import('./pages/accounts'));
const AccountDetailPage = lazy(() => import('./pages/accounts/[id]'));
const OpportunitiesPage = lazy(() => import('./pages/opportunities'));
const EMISchedulesPage = lazy(() => import('./pages/emi-schedules'));
const MarketingPage = lazy(() => import('./pages/marketing'));
const AdsDashboard = lazy(() => import('./pages/marketing/ads'));
const AdsManager = lazy(() => import('./pages/marketing/AdsManager'));
const CreateCampaignPage = lazy(() => import('./pages/marketing/new-campaign'));
const CommunicationsPage = lazy(() => import('./pages/communications'));
const CalendarPage = lazy(() => import('./pages/calendar'));
const FollowUpsPage = lazy(() => import('./pages/follow-ups'));
const CallsPage = lazy(() => import('./pages/calls'));
const SettingsPage = lazy(() => import('./pages/settings'));
const AutomationPage = lazy(() => import('./pages/automation'));
const ProductsPage = lazy(() => import('./pages/products'));
const QuotesPage = lazy(() => import('./pages/quotes'));
const FieldForcePage = lazy(() => import('./pages/field-force'));
const SupportPage = lazy(() => import('./pages/support'));
const GoalsPage = lazy(() => import('./pages/goals'));
const SalesTargetsPage = lazy(() => import('./pages/sales-targets'));
const CommissionsPage = lazy(() => import('./pages/sales/commissions'));
const ReportsPage = lazy(() => import('./pages/reports'));
const WhatsAppInbox = lazy(() => import('./pages/WhatsAppInbox'));
const SMSCampaignsPage = lazy(() => import('./pages/marketing/sms'));
const LandingPagesManager = lazy(() => import('./pages/marketing/landing-pages'));
const WebFormsPage = lazy(() => import('./pages/marketing/forms'));
const WhatsAppCampaignsPage = lazy(() => import('./pages/marketing/whatsapp'));
const EmailListsPage = lazy(() => import('./pages/marketing/lists'));

// Settings sub-pages
const ProfileSettingsPage = lazy(() => import('./pages/settings/profile'));
const TeamSettingsPage = lazy(() => import('./pages/settings/team'));
const BranchesSettingsPage = lazy(() => import('./pages/settings/organisation/Branches'));
const RolesSettingsPage = lazy(() => import('./pages/settings/roles'));
const CustomFieldsSettingsPage = lazy(() => import('./pages/settings/custom-fields'));
const TerritoriesSettingsPage = lazy(() => import('./pages/settings/territories'));
const SuperAdminDashboard = lazy(() => import('./pages/super-admin'));
const OrganisationDetailPage = lazy(() => import('./pages/super-admin/organisation/[id]'));
const SeoSettingsPage = lazy(() => import('./pages/super-admin/seo'));
const SuperAdminRestorePage = lazy(() => import('./pages/super-admin/restore'));
const OrganisationSettingsPage = lazy(() => import('./pages/settings/organisation'));
const LeadScoringSettingsPage = lazy(() => import('./pages/settings/lead-scoring'));
const AssignmentRulesPage = lazy(() => import('./pages/settings/assignment-rules'));
const HierarchyPage = lazy(() => import('./pages/organisation/hierarchy'));
const AiWriterPage = lazy(() => import('./pages/marketing/ai-writer'));
const WorkflowsPage = lazy(() => import('./pages/automation/workflows'));
const CreateWorkflowPage = lazy(() => import('./pages/automation/new'));
const WorkflowDetailPage = lazy(() => import('./pages/automation/WorkflowDetail'));
const SalesBookPage = lazy(() => import('./pages/reports/SalesBook'));
const UserSalesPage = lazy(() => import('./pages/reports/UserSales'));
const AnalyticsPage = lazy(() => import('./pages/reports/analytics'));
const CampaignReportsPage = lazy(() => import('./pages/reports/campaigns'));
const FieldForceReportsPage = lazy(() => import('./pages/reports/field-force'));
const LeadReportsPage = lazy(() => import('./pages/reports/leads'));
const FollowUpReportsPage = lazy(() => import('./pages/reports/follow-ups'));
const AuditLogsReportPage = lazy(() => import('./pages/reports/audit-logs'));
const CallAnalyticsPage = lazy(() => import('./pages/reports/CallAnalytics'));
const UserTotalReportPage = lazy(() => import('./pages/reports/PerformanceReport'));
const DailyReportPage = lazy(() => import('./pages/reports/DailyReport'));
const LeadDistributionReportPage = lazy(() => import('./pages/reports/LeadDistribution'));
const IntegrationsSettingsPage = lazy(() => import('./pages/settings/Integrations'));
const NotificationsSettingsPage = lazy(() => import('./pages/settings/notifications'));
const NotificationsPage = lazy(() => import('./pages/notifications'));
const CallRecordingSettingsPage = lazy(() => import('./pages/settings/call-recording'));
const ImportSettingsPage = lazy(() => import('./pages/settings/import'));
const BulkImportSettingsPage = lazy(() => import('./pages/settings/bulk-import'));
const BillingSettingsPage = lazy(() => import('./pages/settings/Billing'));
const AuditLogsPage = lazy(() => import('./pages/settings/audit-logs'));
const DeveloperSettingsPage = lazy(() => import('./pages/settings/developer'));
const WhatsAppScraperSettingsPage = lazy(() => import('./pages/settings/whatsapp-scraper'));
const GmailCallbackPage = lazy(() => import('./pages/settings/gmail-callback'));
const LeadStatusesSettingsPage = lazy(() => import('./pages/settings/lead-statuses'));
const BroadcastSettingsPage = lazy(() => import('./pages/settings/broadcast'));
const SSOLogin = lazy(() => import('./pages/SSOLogin'));

const TrashPage = lazy(() => import('./pages/trash'));

const TrainingPage = lazy(() => import('./pages/Training'));

const queryClient = new QueryClient({
 defaultOptions: {
  queries: {
   staleTime: 1000 * 60 * 5,
   gcTime: 1000 * 60 * 30,
   refetchOnWindowFocus: true,
   refetchOnMount: true,
   retry: 1
  },
 },
});

function AppContent() {
 const [isAuthInitialized, setIsAuthInitialized] = useState(false);

 useEffect(() => {
  const syncWithAndroid = async (token: string) => {
   try {
    const { syncToken } = await import('./utils/mobileBridge');
    const { triggerAndroidLeadSync, saveAndroidToken, saveAndroidApiUrl } = await import('./utils/androidBridge');
    const { API_URL } = await import('./config');

    syncToken(token);
    saveAndroidToken(token);
    saveAndroidApiUrl(API_URL);
    triggerAndroidLeadSync(token);
   } catch (e) {
    console.error("Android sync failed", e);
   }
  };

  const initializeAuth = async () => {
   let userInfo = localStorage.getItem('userInfo');

   // 1. Try Android Native Recovery
   if (!userInfo) {
    try {
     const { getAndroidToken } = await import('./utils/androidBridge');
     const nativeToken = getAndroidToken();
     const autoLogin = localStorage.getItem('autoLogin') === 'true';

     if (nativeToken && autoLogin) {
      const placeholderInfo = { token: nativeToken, fromNative: true };
      localStorage.setItem('userInfo', JSON.stringify(placeholderInfo));
      userInfo = JSON.stringify(placeholderInfo);
     }
    } catch (e) {
     console.error("Android recovery failed", e);
    }
   }

   // 2. Validate and Sync Session
   if (userInfo) {
    try {
     const parsed = JSON.parse(userInfo);
     if (parsed.token) {
      await syncWithAndroid(parsed.token);

      // 3. Fresh verification from API
      const { api } = await import('./services/api');
      const res = await api.get('/auth/me');
      if (res.data) {
       const updatedUser = { ...parsed, ...res.data };
       localStorage.setItem('userInfo', JSON.stringify(updatedUser));
       window.dispatchEvent(new CustomEvent('auth-refresh', { detail: updatedUser }));
      }
     }
    } catch (err) {
      const status = (err as any).response?.status;
      if (status === 401) {
       console.log('Session validation: Token is expired or unauthorized.');
       localStorage.removeItem('userInfo');
       localStorage.removeItem('autoLogin');
      } else {
       console.error('Session validation failed due to network or server error:', err);
      }
    }
   }

   setIsAuthInitialized(true);
  };

  // Failsafe: if initializeAuth hangs (e.g. network timeout), drop the loading screen after 15s
  const fallbackTimer = setTimeout(() => {
   setIsAuthInitialized(true);
  }, 15000);

  initializeAuth().finally(() => {
   clearTimeout(fallbackTimer);
  });

  const handleAuthRefresh = (e: any) => {
   if (e.detail?.token) syncWithAndroid(e.detail.token);
  };
  window.addEventListener('auth-refresh' as any, handleAuthRefresh);

  const handleStorageChange = (e: StorageEvent) => {
   if (e.key === 'userInfo' && e.newValue) {
    try {
     const parsed = JSON.parse(e.newValue);
     if (parsed.token) syncWithAndroid(parsed.token);
    } catch { }
   }
  };
  window.addEventListener('storage', handleStorageChange);

  const handleVisibilityChange = () => {
   if (document.visibilityState === 'visible') {
    queryClient.invalidateQueries();
   }
  };
  window.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
   window.removeEventListener('auth-refresh' as any, handleAuthRefresh);
   window.removeEventListener('storage', handleStorageChange);
   window.removeEventListener('visibilitychange', handleVisibilityChange);
  };
 }, []);

 const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
   try {
    const parsed = JSON.parse(userInfo);
    if (parsed.token) {
     return <Navigate to="/dashboard" replace />;
    }
   } catch { }
  }
  return children;
 };

 if (!isAuthInitialized) {
  return <PageLoader text="Verifying session..." />;
 }

 return (
  <SocketProvider>
   <Router>
    <Suspense fallback={<PageLoader text="Loading..." />}>
     <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/sso-login" element={<Suspense fallback={<PageLoader text="Loading SSO" />}><PublicRoute><SSOLogin /></PublicRoute></Suspense>} />
      <Route path="/sso-callback" element={<SSOCallback />} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password/:resetToken" element={<ResetPassword />} />
      <Route path="/pages/:slug" element={<LandingPageView />} />

      <Route element={<Layout />}>
       <Route path="/dashboard" element={<Dashboard />} />
       <Route path="/leads" element={<LeadsPage />} />
       <Route path="/leads/import" element={<BulkImportLeadsPage />} />
       <Route path="/leads/new" element={<CreateLeadPage />} />
       <Route path="/leads/:id" element={<LeadDetailPage />} />
       <Route path="/re-enquiries" element={<ReEnquiriesPage />} />
       <Route path="/duplicates" element={<DuplicatesPage />} />
       <Route path="/contacts" element={<ContactsPage />} />
       <Route path="/contacts/:id" element={<ContactDetailPage />} />
       <Route path="/accounts" element={<AccountsPage />} />
       <Route path="/accounts/:id" element={<AccountDetailPage />} />
       <Route path="/opportunities" element={<OpportunitiesPage />} />
       <Route path="/emi-schedules" element={<EMISchedulesPage />} />
       <Route path="/marketing" element={<MarketingPage />} />
       <Route path="/marketing/ads" element={<AdsDashboard />} />
       <Route path="/marketing/ads-manager" element={<AdsManager />} />
       <Route path="/marketing/sms" element={<SMSCampaignsPage />} />
       <Route path="/marketing/landing-pages" element={<LandingPagesManager />} />
       <Route path="/marketing/forms" element={<WebFormsPage />} />
       <Route path="/marketing/campaigns/new" element={<CreateCampaignPage />} />
       <Route path="/marketing/lists" element={<EmailListsPage />} />
       <Route path="/marketing/whatsapp" element={<WhatsAppCampaignsPage />} />
       <Route path="/communications" element={<CommunicationsPage />} />
       <Route path="/whatsapp/inbox" element={<WhatsAppInbox />} />
       <Route path="/calendar" element={<CalendarPage />} />
       <Route path="/follow-ups" element={<FollowUpsPage />} />
       <Route path="/calls" element={<CallsPage />} />
       <Route path="/settings" element={<SettingsPage />} />
       <Route path="/ai-writer" element={<AiWriterPage />} />
       <Route path="/analytics" element={<AnalyticsPage />} />
       <Route path="/users/:id" element={<UserProfilePage />} />
       <Route path="/organisation/hierarchy" element={<HierarchyPage />} />
       <Route path="/settings/profile" element={<ProfileSettingsPage />} />
       <Route path="/settings/team" element={<TeamSettingsPage />} />
       <Route path="/settings/branches" element={<BranchesSettingsPage />} />
       <Route path="/settings/roles" element={<RolesSettingsPage />} />
       <Route path="/settings/custom-fields" element={<CustomFieldsSettingsPage />} />
       <Route path="/settings/territories" element={<TerritoriesSettingsPage />} />
       <Route path="/settings/call-recording" element={<CallRecordingSettingsPage />} />
       <Route path="/settings/whatsapp-scraper" element={<WhatsAppScraperSettingsPage />} />
       <Route path="/settings/import" element={<ImportSettingsPage />} />
       <Route path="/settings/bulk-import" element={<BulkImportSettingsPage />} />
       <Route path="/settings/billing" element={<BillingSettingsPage />} />
       <Route path="/settings/audit-logs" element={<AuditLogsPage />} />
       <Route path="/settings/developer" element={<DeveloperSettingsPage />} />
       <Route path="/settings/broadcast" element={<BroadcastSettingsPage />} />
       <Route path="/automation" element={<AutomationPage />} />
       <Route path="/settings/organisation" element={<OrganisationSettingsPage />} />
       <Route path="/automation/new" element={<CreateWorkflowPage />} />
       <Route path="/automation/:id" element={<WorkflowDetailPage />} />
       <Route path="/workflows" element={<WorkflowsPage />} />
       <Route path="/products" element={<ProductsPage />} />
       <Route path="/quotes" element={<QuotesPage />} />
       <Route path="/field-force" element={<FieldForcePage />} />
       <Route path="/support" element={<SupportPage />} />
       <Route path="/training" element={<TrainingPage />} />
       <Route path="/trash" element={<TrashPage />} />
       <Route path="/goals" element={<GoalsPage />} />
       <Route path="/sales-targets" element={<SalesTargetsPage />} />
       <Route path="/sales/commissions" element={<CommissionsPage />} />
       <Route path="/reports" element={<ReportsPage />} />
       <Route path="/reports/analytics" element={<AnalyticsPage />} />
       <Route path="/reports/sales-book" element={<SalesBookPage />} />
       <Route path="/reports/user-sales" element={<UserSalesPage />} />
       <Route path="/reports/campaigns" element={<CampaignReportsPage />} />
       <Route path="/reports/field-force" element={<FieldForceReportsPage />} />
       <Route path="/reports/leads" element={<LeadReportsPage />} />
       <Route path="/reports/follow-ups" element={<FollowUpReportsPage />} />
       <Route path="/reports/audit-logs" element={<AuditLogsReportPage />} />
       <Route path="/reports/call-analytics" element={<CallAnalyticsPage />} />
       <Route path="/reports/user-total" element={<UserTotalReportPage />} />
       <Route path="/reports/daily" element={<DailyReportPage />} />
       <Route path="/reports/lead-distribution" element={<LeadDistributionReportPage />} />
       <Route path="/super-admin" element={<SuperAdminDashboard />} />
       <Route path="/super-admin/organisation/:id" element={<OrganisationDetailPage />} />
       <Route path="/super-admin/seo" element={<SeoSettingsPage />} />
       <Route path="/super-admin/restore" element={<SuperAdminRestorePage />} />
       <Route path="/settings/lead-scoring" element={<LeadScoringSettingsPage />} />
       <Route path="/settings/assignment-rules" element={<AssignmentRulesPage />} />
       <Route path="/settings/integrations" element={<IntegrationsSettingsPage />} />
       <Route path="/settings/notifications" element={<NotificationsSettingsPage />} />
       <Route path="/settings/lead-statuses" element={<LeadStatusesSettingsPage />} />
       <Route path="/settings/gmail-callback" element={<GmailCallbackPage />} />
       <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/shared-product/:slug" element={<SharedProductPage />} />
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
     </Routes>
    </Suspense>
   </Router>
  </SocketProvider>
 );
}

import { HelmetProvider } from 'react-helmet-async';

function App() {
 return (
  <HelmetProvider>
   <ThemeProvider>
    <CurrencyProvider>
     <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster
       position="bottom-right"
       expand={true}
       richColors
       closeButton
       duration={4000}
       toastOptions={{
        style: { borderRadius: '12px' },
       }}
      />
     </QueryClientProvider>
    </CurrencyProvider>
   </ThemeProvider>
  </HelmetProvider>
 );
}

export default App;