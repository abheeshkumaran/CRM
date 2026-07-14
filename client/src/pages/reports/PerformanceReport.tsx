import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserPerformanceDetails } from "@/services/analyticsService";
import { getBranches } from "@/services/settingsService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { 
  Activity, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  FileText, 
  Download, 
  Calendar,
  Users,
  Building,
  RefreshCw,
  Award,
  Target,
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageHeader from "../../components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  ComposedChart,
  Line
} from "recharts";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#22c55e'];

export default function UserPerformanceReport() {
  const { formatCurrency } = useCurrency();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filter States
  const [startDate, setStartDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [activePeriod, setActivePeriod] = useState<string>("today");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>({ key: 'metrics.performanceIndex', direction: 'desc' });

  // Fetch Base Data
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  });

  const { data: performanceData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['userPerformanceDetails', startDate, endDate, selectedBranchId],
    queryFn: () => getUserPerformanceDetails({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      branchId: selectedBranchId === "all" ? undefined : selectedBranchId
    })
  });

  // Derived Data for Filters and Display
  const filteredPerformanceData = useMemo(() => {
    if (!performanceData) return [];
    let data = [...performanceData];
    
    // Filter by User
    if (selectedUserId !== "all") {
      data = data.filter((u: any) => u.userId === selectedUserId);
    }

    // Apply Sorting
    if (sortConfig) {
      data.sort((a, b) => {
        const getValue = (obj: any, path: string) => {
          return path.split('.').reduce((acc, part) => acc && acc[part], obj);
        };
        
        const aValue = getValue(a, sortConfig.key);
        const bValue = getValue(b, sortConfig.key);

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return data;
  }, [performanceData, selectedUserId, sortConfig]);

  const userOptions = useMemo(() => {
    if (!performanceData) return [];
    return performanceData.map((u: any) => ({ id: u.userId, name: u.name }));
  }, [performanceData]);

  // Summary Metrics
  const summary = useMemo(() => {
    if (!filteredPerformanceData || filteredPerformanceData.length === 0) return null;
    
    const data = filteredPerformanceData;
    const total = data.length;
    const totalLeads = data.reduce((acc: number, u: any) => acc + u.metrics.totalLeads, 0);
    const totalCalls = data.reduce((acc: number, u: any) => acc + u.metrics.callsMade, 0);
    const totalConversions = data.reduce((acc: number, u: any) => acc + u.metrics.wonDeals, 0);
    const totalUnattended = data.reduce((acc: number, u: any) => acc + u.metrics.unattendedLeads, 0);
    const totalRevenue = data.reduce((acc: number, u: any) => acc + u.metrics.revenue, 0);
    const avgIndex = data.reduce((acc: number, u: any) => acc + u.metrics.performanceIndex, 0) / total;

    return {
      totalUsers: total,
      totalLeads,
      totalCalls,
      totalConversions,
      totalUnattended,
      totalRevenue,
      avgPerformanceIndex: avgIndex.toFixed(1),
      overallConversion: ((totalConversions / (totalLeads || 1)) * 100).toFixed(1)
    };
  }, [filteredPerformanceData]);

  // Period handlers
  const setPeriod = (period: string) => {
    setActivePeriod(period);
    const now = new Date();
    let start, end;

    switch (period) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        return;
    }

    setStartDate(format(start, "yyyy-MM-dd"));
    setEndDate(format(end, "yyyy-MM-dd"));
  };

  // PDF Generation
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="ml-1 h-3 w-3 text-primary" /> : <ChevronDown className="ml-1 h-3 w-3 text-primary" />;
  };

  const UserPerformanceCard = ({ user }: { user: any }) => (
    <Card className="border border-border/50 shadow-sm overflow-hidden mb-4 bg-card/50">
      <CardHeader className="p-4 border-b bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-primary/10 shadow-sm">
              <AvatarImage src={user.profileImage} />
              <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold">
                {user.name.split(' ').map((n: string) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight">{user.name}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{user.branch}</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className={cn(
              "text-2xl font-black tracking-tighter leading-none",
              user.metrics.performanceIndex > 80 ? "text-primary" : user.metrics.performanceIndex > 50 ? "text-blue-500" : "text-orange-500"
            )}>
              {user.metrics.performanceIndex}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase">Index Score</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Revenue</p>
          <p className="text-sm font-black text-foreground">{formatCurrency(user.metrics.revenue)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Leads</p>
          <p className="text-sm font-black text-foreground">{user.metrics.totalLeads}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Calls</p>
          <div className="flex items-baseline gap-1">
            <p className="text-sm font-black text-blue-600">{user.metrics.callsMade}</p>
            <span className="text-[10px] text-muted-foreground">interactions</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target Match</p>
          <div className="flex items-baseline gap-1">
            <p className="text-sm font-black text-green-600">{user.metrics.wonDeals}</p>
            <span className="text-[10px] text-muted-foreground">({user.metrics.conversionRate}%)</span>
          </div>
        </div>
      </CardContent>
      <div className="h-1.5 w-full bg-muted overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-500",
            user.metrics.performanceIndex > 80 ? "bg-primary" : user.metrics.performanceIndex > 50 ? "bg-blue-500" : "bg-orange-500"
          )} 
          style={{ width: `${user.metrics.performanceIndex}%` }} 
        />
      </div>
    </Card>
  );

  const downloadPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    toast.info("Preparing PDF report...");
    
    try {
      // Give time for layout adjustment
      await new Promise(r => setTimeout(r, 500));
      
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        style: {
          padding: '20px'
        }
      });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);
      
      const pxWidth = img.width;
      const pxPageHeight = (img.width * contentHeight) / contentWidth;
      
      let totalHeightLeft = img.height;
      let startY = 0;
      let firstPage = true;

      while (totalHeightLeft > 0) {
        if (!firstPage) pdf.addPage();
        
        const canvas = document.createElement('canvas');
        const sliceHeight = Math.min(pxPageHeight, totalHeightLeft);
        
        canvas.width = pxWidth;
        canvas.height = sliceHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, startY, pxWidth, sliceHeight, 0, 0, pxWidth, sliceHeight);
          const sliceDataUrl = canvas.toDataURL('image/png');
          const displayHeight = (sliceHeight * contentWidth) / pxWidth;
          pdf.addImage(sliceDataUrl, 'PNG', margin, margin, contentWidth, displayHeight);
        }
        
        startY += sliceHeight;
        totalHeightLeft -= sliceHeight;
        firstPage = false;
      }

      pdf.save(`User_Total_Report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF report downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-[1600px] mx-auto">
      <PageHeader
        title="User Total Report"
        description="Comprehensive individual-wise performance metrics, activity logs, and conversion analysis."
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              disabled={isRefetching}
              className="bg-background/50 hover:bg-background"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={downloadPDF} disabled={isExporting} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Generating..." : "Download PDF"}
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card className="border-none shadow-sm bg-muted/30 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Location</label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="h-10 bg-background border-border/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="All Branches" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Organizations</SelectItem>
                  {(branches || []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Representative</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="h-10 bg-background border-border/50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="All Users" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">All Representatives</SelectItem>
                  {(userOptions || []).map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Period</label>
              <div className="flex bg-background rounded-xl border border-border/50 h-10 overflow-x-auto">
                {['today', 'week', 'month', 'year'].map((period) => (
                  <Button 
                    key={period}
                    variant={activePeriod === period ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPeriod(period)}
                    className={cn(
                      "min-w-16 flex-1 capitalize text-xs h-full rounded-lg px-2",
                      activePeriod === period ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">Frequency Window</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => {setStartDate(e.target.value); setActivePeriod('custom');}} 
                    className="h-10 pl-10 bg-background border-border/50 rounded-xl" 
                  />
                </div>
                <span className="text-muted-foreground font-medium text-sm">to</span>
                <div className="relative flex-1">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => {setEndDate(e.target.value); setActivePeriod('custom');}} 
                    className="h-10 pl-10 bg-background border-border/50 rounded-xl" 
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Analytics Container */}
      <div ref={reportRef} className="space-y-8 bg-background rounded-2xl">
        {/* Scorecards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-full">
            <Card className="h-full border-none shadow-sm bg-gradient-to-br from-primary/10 via-background to-background ring-1 ring-primary/5 transition-all hover:scale-[1.02] active:scale-95 duration-200">
              <CardHeader className="pb-2 h-full flex flex-col justify-between">
                <CardDescription className="flex items-center gap-2 text-primary font-bold">
                  <Award className="h-4 w-4" /> TEAM PERFORMANCE INDEX
                </CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter text-primary">
                  {summary?.avgPerformanceIndex}
                  <span className="text-sm font-normal text-muted-foreground ml-2 tracking-normal">% SCORE</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Link to="/communications" className="block h-full">
            <Card className="h-full border-none shadow-sm bg-gradient-to-br from-blue-50/50 via-background to-background ring-1 ring-blue-500/5 dark:from-blue-900/10 transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer">
              <CardHeader className="pb-2 h-full flex flex-col justify-between">
                <CardDescription className="flex items-center gap-2 text-blue-600 font-bold">
                  <Phone className="h-4 w-4" /> TOTAL INTERACTIONS
                </CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter">
                  {summary?.totalCalls}
                  <span className="text-sm font-normal text-muted-foreground ml-2 tracking-normal">CALLS</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/reports/sales-book" className="block h-full">
            <Card className="h-full border-none shadow-sm bg-gradient-to-br from-green-50/50 via-background to-background ring-1 ring-green-500/5 dark:from-green-900/10 transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer">
              <CardHeader className="pb-2 h-full flex flex-col justify-between">
                <CardDescription className="flex items-center gap-2 text-green-600 font-bold">
                  <Target className="h-4 w-4" /> OVERALL CONVERSION
                </CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter">
                  {summary?.overallConversion}%
                  <span className="text-sm font-normal text-muted-foreground ml-2 tracking-normal">RATE</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/leads?view=status-new" className="block h-full">
            <Card className="h-full border-none shadow-sm bg-gradient-to-br from-red-50/50 via-background to-background ring-1 ring-red-500/5 dark:from-red-900/10 transition-all hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer">
              <CardHeader className="pb-2 h-full flex flex-col justify-between">
                <CardDescription className="flex items-center gap-2 text-red-600 font-bold">
                  <AlertCircle className="h-4 w-4" /> UNATTENDED LEADS
                </CardDescription>
                <CardTitle className="text-4xl font-black tracking-tighter text-red-600">
                  {summary?.totalUnattended}
                  <span className="text-sm font-normal text-muted-foreground ml-2 tracking-normal font-medium uppercase">NEEDS ACTION</span>
                </CardTitle>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Charts Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Activity Comparison Chart */}
          <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Activity vs Conversion Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 min-h-0 min-w-0">
              <div className="h-[300px] sm:h-[400px] w-full min-h-0 min-w-0">
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height="100%" debounce={100}>
                  <ComposedChart data={filteredPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 600}} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none'}}
                      formatter={(value: any, name: string | any) => [name === 'revenue' ? formatCurrency(value) : value, (name || '').toUpperCase()]}
                    />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar yAxisId="left" dataKey="metrics.callsMade" name="calls" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar yAxisId="left" dataKey="metrics.totalLeads" name="leads" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line yAxisId="right" type="monotone" dataKey="metrics.revenue" name="revenue" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b'}} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
 
          {/* Performance Ranking */}
          <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" /> Leaderboard Ranking
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 min-h-0 min-w-0">
              <div className="h-[300px] sm:h-[400px] w-full min-h-0 min-w-0">
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height="100%" debounce={100}>
                  <BarChart data={filteredPerformanceData} layout="vertical" margin={{ left: 40, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700}} width={100} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{borderRadius: '12px', border: 'none'}}
                      formatter={(v) => [`${v}%`, 'Performance Index']}
                    />
                    <Bar dataKey="metrics.performanceIndex" radius={[0, 10, 10, 0]} barSize={25}>
                      {filteredPerformanceData?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#cd7f32' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
 
        {/* Detailed Data Table */}
        <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
          <CardHeader className="border-b bg-muted/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest">Individual Performance Breakdown</CardTitle>
              <CardDescription className="text-xs">Detailed data for all {filteredPerformanceData?.length} sales identifiers.</CardDescription>
            </div>
          </CardHeader>
           <CardContent className="p-0 sm:p-0">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent border-b-border/50">
                    <TableHead onClick={() => handleSort('name')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest">
                      <div className="flex items-center">Representative <SortIcon columnKey="name" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('branch')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Branch <SortIcon columnKey="branch" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.totalLeads')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Owned Leads <SortIcon columnKey="metrics.totalLeads" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.callsMade')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Calls <SortIcon columnKey="metrics.callsMade" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.totalTalkTimeSeconds')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Talk Time <SortIcon columnKey="metrics.totalTalkTimeSeconds" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.statusChanges')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Status Updates <SortIcon columnKey="metrics.statusChanges" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.unattendedLeads')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Unattended <SortIcon columnKey="metrics.unattendedLeads" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.wonDeals')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-center">
                      <div className="flex items-center justify-center">Conversions <SortIcon columnKey="metrics.wonDeals" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.revenue')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end">Revenue <SortIcon columnKey="metrics.revenue" /></div>
                    </TableHead>
                    <TableHead onClick={() => handleSort('metrics.performanceIndex')} className="cursor-pointer group font-bold text-[10px] uppercase tracking-widest text-right">
                      <div className="flex items-center justify-end">Index SCORE <SortIcon columnKey="metrics.performanceIndex" /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPerformanceData?.map((user: any) => (
                    <TableRow key={user.userId} className="hover:bg-muted/30 transition-colors border-b-border/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-border shadow-sm">
                            <AvatarImage src={user.profileImage} />
                            <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                              {user.name.split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-tight">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">{user.role}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-[10px] font-bold uppercase tracking-tighter bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                          {user.branch}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm font-bold">{user.metrics.totalLeads}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-sm text-blue-600">{user.metrics.callsMade}</span>
                          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Calls</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-sm text-primary">{Math.floor(user.metrics.totalTalkTimeSeconds / 60)}m {user.metrics.totalTalkTimeSeconds % 60}s</span>
                          <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Talk Time</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 bg-muted rounded-full">
                          {user.metrics.statusChanges}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white",
                            user.metrics.unattendedLeads > 5 ? "bg-red-500" : user.metrics.unattendedLeads > 0 ? "bg-orange-500" : "bg-green-500"
                          )}
                        >
                          {user.metrics.unattendedLeads}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-sm text-green-600">{user.metrics.wonDeals}</span>
                          <span className="text-[9px] text-muted-foreground font-black tracking-tighter">{user.metrics.conversionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-sm">{formatCurrency(user.metrics.revenue)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-col items-end">
                          <span className={cn(
                            "text-lg font-black tracking-tighter",
                            user.metrics.performanceIndex > 80 ? "text-primary" : user.metrics.performanceIndex > 50 ? "text-blue-500" : "text-orange-500"
                          )}>
                            {user.metrics.performanceIndex}
                          </span>
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-primary" style={{ width: `${user.metrics.performanceIndex}%` }} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden p-4 space-y-4">
              {filteredPerformanceData?.map((user: any) => (
                <UserPerformanceCard key={user.userId} user={user} />
              ))}
            </div>
            
            {/* Empty State */}
            {filteredPerformanceData?.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <div className="font-medium">No performance data found for the selected criteria.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
