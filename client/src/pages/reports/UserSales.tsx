import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUserWiseSales, getSalesChartData } from "@/services/analyticsService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Trophy, 
  Download, 
  FileText, 
  Calendar, 
  User as UserIcon, 
  TrendingUp, 
  Award, 
  Target,
  Filter
} from "lucide-react";
import { cn, isAdmin as checkIsAdmin } from "@/lib/utils";
import PageHeader from "../../components/shared/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getBranches } from "@/services/settingsService";
import { getUsers } from "@/services/userService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useCurrency } from "@/contexts/CurrencyContext";
import { api } from "@/services/api";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#4f46e5', '#db2777', '#ca8a04', '#059669', '#65a30d'];

export default function UserSalesPage() {
  const { formatCurrency } = useCurrency();
  const reportRef = useRef<HTMLDivElement>(null);
  const [user] = useState<{ id: string, role: string } | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });

  const isAdmin = checkIsAdmin(user);

  // Filter States
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [activePeriod, setActivePeriod] = useState<string>("month");

  // Fetch Base Data
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: !!isAdmin
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-sales-list', selectedBranchId],
    queryFn: () => getUsers(), // Assuming this fetches all users in org/branch scope
    enabled: !!isAdmin
  });

  const { data: userStats, isLoading } = useQuery({
    queryKey: ['userSales', startDate, endDate, selectedBranchId],
    queryFn: () => getUserWiseSales({
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      branchId: selectedBranchId || undefined
    })
  });

  // Fetch Trend Data for the selected scope
  const { data: trendData, isLoading: isTrendLoading } = useQuery({
    queryKey: ['salesTrend', selectedBranchId, selectedUserId],
    queryFn: () => getSalesChartData(selectedBranchId || undefined, selectedUserId === "all" ? undefined : selectedUserId)
  });

  // Derived Selection
  const currentUserStat = useMemo(() => {
    if (!userStats || selectedUserId === "all") return null;
    return userStats.find((s: any) => s.userId === selectedUserId);
  }, [userStats, selectedUserId]);

  // Period handlers
  const setPeriod = (period: string) => {
    setActivePeriod(period);
    const now = new Date();
    let start, end;

    switch (period) {
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
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    
    // Add class for PDF styling
    reportRef.current.classList.add('is-exporting');
    
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Get image height dynamically
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const pdfHeight = (img.height * pdfWidth) / img.width;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Sales_Report_${selectedUserId === "all" ? "Team" : selectedUserId}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("PDF report downloaded successfully!");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      // Remove class after capture
      reportRef.current.classList.remove('is-exporting');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <PageHeader
        title="Visual Sales Report"
        description="Interactive performance analysis and downloadable PDF reports."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadPDF} className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Download PDF
            </Button>
            <Button variant="secondary" onClick={async () => {
              try {
                const params = new URLSearchParams();
                if (startDate) params.append('startDate', startDate);
                if (endDate) params.append('endDate', endDate);
                if (selectedBranchId) params.append('branchId', selectedBranchId);

                const response = await api.get(`/reports/export/user-sales?${params.toString()}`, {
                  responseType: 'blob'
                });

                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `sales_data_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
              } catch (error) { toast.error("Excel export failed"); }
            }}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* Global Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-card p-6 rounded-xl border shadow-sm items-end">
        {isAdmin && branches && branches.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Location/Branch</label>
            <Select value={selectedBranchId || "all"} onValueChange={(val) => setSelectedBranchId(val === "all" ? null : val)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Organizations</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Sales Representative</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Sales Reps" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Team Overview</SelectItem>
              {userStats?.map((s: any) => (
                <SelectItem key={s.userId} value={s.userId}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Time Period</label>
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {['week', 'month', 'year'].map((p) => (
              <Button 
                key={p}
                variant={activePeriod === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="flex-1 capitalize text-xs h-8"
              >
                {p}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2 lg:col-span-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase">Custom Range</label>
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => {setStartDate(e.target.value); setActivePeriod('custom');}} className="h-9" />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={endDate} onChange={(e) => {setEndDate(e.target.value); setActivePeriod('custom');}} className="h-9" />
          </div>
        </div>
      </div>

      {/* Visual Report Container (Target for PDF) */}
      <div ref={reportRef} className="space-y-8 bg-background">
        {/* Header for PDF */}
        <div className="hidden pdf-only flex justify-between items-center border-b pb-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Sales Performance Report</h1>
            <p className="text-sm text-muted-foreground">{format(new Date(startDate), "PPP")} - {format(new Date(endDate), "PPP")}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{selectedUserId === "all" ? "Team Report" : currentUserStat?.name}</p>
            <p className="text-xs text-muted-foreground">Generated on {format(new Date(), "PPpp")}</p>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-900/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Total Revenue</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {selectedUserId === "all" 
                  ? formatCurrency(userStats?.reduce((s:any, c:any)=>s+c.totalRevenue, 0) || 0)
                  : formatCurrency(currentUserStat?.totalRevenue || 0)
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-background dark:from-green-900/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Award className="h-3 w-3" /> Deals Won</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {selectedUserId === "all" 
                  ? userStats?.reduce((s:any, c:any)=>s+c.dealsCount, 0) || 0
                  : currentUserStat?.dealsCount || 0
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-background dark:from-purple-900/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Target className="h-3 w-3" /> Conversion Rate</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {selectedUserId === "all" 
                  ? `${Math.round(userStats?.reduce((s:any, c:any)=>s+c.winRate, 0) / (userStats?.length || 1) || 0)}%`
                  : `${Math.round(currentUserStat?.winRate || 0)}%`
                }
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-background dark:from-orange-900/10">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Avg. Deal Size</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {selectedUserId === "all" 
                  ? formatCurrency(userStats?.reduce((s:any, c:any)=>s+c.avgDealSize, 0) / (userStats?.length || 1) || 0)
                  : formatCurrency(currentUserStat?.avgDealSize || 0)
                }
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Main Visuals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Sales Trend (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[350px]">
              {isTrendLoading ? <Skeleton className="w-full h-full" /> : (
                <ResponsiveContainer minWidth={1} minHeight={1}  width="100%" height="100%" >
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(v) => `\u20B9${v/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(v: any) => [formatCurrency(Number(v || 0)), "Revenue"]}
                    />
                    <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Team Contribution or Individual Highlight */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                {selectedUserId === "all" ? "Top Performers" : "Performance Ranking"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {userStats?.slice(0, 5).map((stat: any, i: number) => (
                <div key={stat.userId} className={cn("flex items-center justify-between p-3 rounded-lg border", selectedUserId === stat.userId ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-transparent")}>
                  <div className="flex items-center gap-3">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-400" : "bg-slate-300")}>
                      {i + 1}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">{stat.name}</span>
                      <span className="text-[10px] text-muted-foreground">{stat.dealsCount} Deals Won</span>
                    </div>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(stat.totalRevenue, { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Revenue Share
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer minWidth={1} minHeight={300} width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userStats || []}
                    dataKey="totalRevenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={60}
                    paddingAngle={2}
                    label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {(userStats || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [formatCurrency(Number(v || 0)), "Revenue"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Win Rate Tracker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-600" /> Win Rate Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer minWidth={1} minHeight={300} width="100%" height="100%">
                <BarChart data={userStats?.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => [`${Number(v || 0)}%`, "Win Rate"]} />
                  <Bar dataKey="winRate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Comparative Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase tracking-wider">Historical Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer minWidth={1} minHeight={300} width="100%" height="100%">
              <BarChart data={userStats?.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip formatter={(v: any) => [formatCurrency(Number(v || 0)), "Revenue"]} />
                <Bar dataKey="totalRevenue" radius={[4, 4, 0, 0]}>
                  {userStats?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={selectedUserId === entry.userId ? "#2563eb" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
