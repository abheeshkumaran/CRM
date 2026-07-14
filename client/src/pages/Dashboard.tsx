import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getSalesForecast } from '@/services/analyticsService';
import { getBranches } from '@/services/settingsService';
import { AchievementNotification } from '@/components/AchievementNotification';
import { DailyBriefingDialog } from '@/components/DailyBriefingDialog';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { TopPerformersWidget } from '@/components/dashboard/TopPerformersWidget';

import { SalesChartWidget } from '@/components/dashboard/SalesChartWidget';
import { LeadSourcesWidget } from '@/components/dashboard/LeadSourcesWidget';
import { ReportsOverviewWidget } from '@/components/dashboard/ReportsOverviewWidget';
import { Building2, Calendar, ArrowRight, FileText, Download, Loader2, TrendingUp, Check, Trophy, AlertCircle, Plus, ChevronLeft, ChevronRight, Clock, Users, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { Link } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  } | string;
  // Add other user properties as needed
}

interface Branch {
  id: string;
  name: string;
  // Add other branch properties as needed
}

interface DashboardStats {
  activeOpportunities: number;
  pendingFollowUps: number;
  opportunities: {
    won: number;
    lost: number;
  };
  winRate: number;
  revenueThisMonth: number;
  salesRevenue: number;
  // Add other stats properties as needed
}

interface SalesForecast {
  weightedForecast: number;
  totalPipeline: number;
  // Add other forecast properties as needed
}

export default function Dashboard() {
  const { formatCurrency, formatCurrencyCompact } = useCurrency();
  const [user] = useState<User | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Generate the last 12 months dynamically starting from current month, plus "All Time"
  const monthOptions = (() => {
    const options = [{ value: 'all', label: 'All Time' }];
    const current = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthVal = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: monthVal, label });
    }
    return options;
  })();

  const getCurrentMonthVal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthVal());

  const isAdminUser = checkIsAdmin(user);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        if (isAdminUser) {
          // Admins see all branches
          const data = await getBranches();
          setBranches(data || []);
        } else {
          // Non-admins: check if they manage any branches
          const { api } = await import('@/services/api');
          const res = await api.get('/users/my-team');
          if (res.data?.managedBranches?.length > 0) {
            setBranches(res.data.managedBranches);
          }
        }
      } catch (error) {
        console.error("Failed to fetch branches", error);
      }
    };
    if (user) fetchBranches();
  }, [user, isAdminUser]);

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats', selectedBranchId, selectedMonth],
    queryFn: () => getDashboardStats(selectedBranchId || undefined, selectedMonth === 'all' ? undefined : selectedMonth)
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery<SalesForecast>({
    queryKey: ['forecast', selectedBranchId, selectedMonth],
    queryFn: () => getSalesForecast(selectedBranchId || undefined, selectedMonth === 'all' ? undefined : selectedMonth)
  });

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      setIsExporting(true);
      toast.loading("Preparing your dashboard export...", { id: "export-pdf" });

      // Wait a moment for any micro-animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(dashboardRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: 'hsl(var(--background))',
        style: {
          borderRadius: '0'
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [dashboardRef.current.offsetWidth + 80, dashboardRef.current.offsetHeight + 80]
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 40, 40, pdfWidth - 80, pdfHeight - 80);
      pdf.save(`dashboard-analytics-${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success("Dashboard exported successfully!", { id: "export-pdf" });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export dashboard. Please try again.", { id: "export-pdf" });
    } finally {
      setIsExporting(false);
    }
  };

  if (statsLoading || forecastLoading) {
    return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-[2rem]" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-[400px] rounded-[2rem]" />
          <Skeleton className="col-span-3 h-[400px] rounded-[2rem]" />
        </div>
      </div>
    );
  }

  return (
    <div ref={dashboardRef} className="space-y-4 sm:space-y-8 p-3 sm:p-8 animate-in fade-in duration-500 pb-20 sm:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-0.5 text-xs sm:text-base opacity-80">
            Performance overview for today.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          {branches.length > 0 && (
            <div className="w-full sm:w-[200px]">
              <Select
                value={selectedBranchId || "all"}
                onValueChange={(val) => setSelectedBranchId(val === "all" ? null : val)}
              >
                <SelectTrigger className="h-10 w-full bg-background border-input rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="All Branches" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((branch: Branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-[200px]">
            <Select
              value={selectedMonth}
              onValueChange={setSelectedMonth}
            >
              <SelectTrigger className="h-10 w-full bg-background border-input rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select Month" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <ErrorBoundary name="DailyBriefingDialog">
              <DailyBriefingDialog />
            </ErrorBoundary>

            <Button
              variant="outline"
              className="h-10 w-10 sm:w-auto sm:gap-2 rounded-xl p-0 sm:px-4"
              onClick={handleExportPDF}
              disabled={isExporting}
              title="Export PDF"
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
            </Button>

            <Link to="/calendar">
              <Button variant="outline" className="h-10 w-10 sm:w-auto sm:gap-2 rounded-xl p-0 sm:px-4" title="Schedule">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Schedule</span>
              </Button>
            </Link>

            <Link to="/leads/new">
              <Button className="h-10 gap-1.5 sm:gap-2 shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5 rounded-xl px-4">
                <Plus className="h-4 w-4" />
                <span><span className="hidden xs:inline">New </span>Lead</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ErrorBoundary name="AchievementNotification">
        <AchievementNotification />
      </ErrorBoundary>

      {/* Quick Stats Row */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <Link to="/opportunities" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[9px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Exp. Revenue</h3>
            <div className="text-lg sm:text-2xl font-extrabold text-card-foreground">
              {formatCurrencyCompact(forecast?.totalPipeline || 0)}
            </div>
          </div>
        </Link>

        <Link to="/opportunities" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Check className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[9px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Pipeline</h3>
            <div className="text-xl sm:text-2xl font-extrabold text-card-foreground">
              {stats?.activeOpportunities || 0}
            </div>
          </div>
        </Link>

        <Link to="/follow-ups" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[9px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Follow-ups</h3>
            <div className="text-xl sm:text-2xl font-extrabold text-card-foreground">
              {stats?.pendingFollowUps || 0}
            </div>
          </div>
        </Link>

        <Link to="/opportunities?stage=closed_won" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[9px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Won</h3>
            <div className="text-xl sm:text-2xl font-extrabold text-card-foreground">
              {stats?.opportunities?.won || 0}
            </div>
          </div>
        </Link>

        <Link to="/opportunities?stage=closed_lost" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[10px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Lost Deals</h3>
            <div className="text-xl sm:text-2xl font-extrabold text-card-foreground">
              {stats?.opportunities?.lost || 0}
            </div>
          </div>
        </Link>

        <Link to="/reports/sales-book" className="block relative overflow-hidden rounded-[2rem] bg-card p-4 sm:p-6 shadow-sm border-0 transition-all hover:shadow-md hover:-translate-y-1 group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex flex-col items-center justify-center space-y-2 sm:space-y-3">
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h3 className="text-[9px] sm:text-sm font-bold text-muted-foreground text-center uppercase tracking-tight sm:normal-case sm:tracking-normal">Total Revenue</h3>
            <div className="text-lg sm:text-2xl font-extrabold text-card-foreground">
              {formatCurrencyCompact(stats?.salesRevenue || 0)}
            </div>
          </div>
        </Link>


      </div>

      {/* Reports Overview Row */}
      <div className="grid gap-6">
        <ErrorBoundary name="ReportsOverviewWidget">
          <ReportsOverviewWidget />
        </ErrorBoundary>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 min-w-0">
          <ErrorBoundary name="SalesChartWidget">
            <SalesChartWidget branchId={selectedBranchId} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-3 space-y-6">
          <ErrorBoundary name="TopPerformersWidget">
            <TopPerformersWidget branchId={selectedBranchId} />
          </ErrorBoundary>
          <ErrorBoundary name="LeadSourcesWidget">
            <LeadSourcesWidget branchId={selectedBranchId} />
          </ErrorBoundary>
        </div>
      </div>


      {/* Activity Row */}
      <div className="grid gap-6 md:grid-cols-1">
        <ErrorBoundary name="RecentActivityWidget">
          <RecentActivityWidget branchId={selectedBranchId} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
