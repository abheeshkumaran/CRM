import { useQuery } from '@tanstack/react-query';
import { useState, useRef } from 'react';
import { getSalesChartData, getLeadSourceAnalytics, getTopLeads } from '@/services/analyticsService';
import { getLeads, type Lead } from '@/services/leadService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, BarChart, Bar } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Building } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import * as htmlToImage from "html-to-image";
import { ensureArray } from "@/hooks/useArrayData";
import { isAdmin as checkIsAdmin } from "@/lib/utils";
import { getBranches } from "@/services/settingsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#34d399', '#2dd4bf', '#38bdf8', '#818cf8', '#a78bfa', '#f472b6'];

export default function AnalyticsPage() {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [user] = useState<{ role: string } | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });

  const isAdmin = checkIsAdmin(user);

  // Fetch Branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches,
    enabled: !!isAdmin
  });

  const branchParam = selectedBranchId === "all" ? undefined : selectedBranchId;

  const { data: salesDataRaw, isLoading: salesLoading } = useQuery({ 
    queryKey: ['salesChart', selectedBranchId], 
    queryFn: () => getSalesChartData(branchParam) 
  });
  const { data: leadSourcesRaw, isLoading: sourcesLoading } = useQuery({ 
    queryKey: ['leadSources', selectedBranchId], 
    queryFn: () => getLeadSourceAnalytics(branchParam) 
  });
  const { data: topLeadsRaw, isLoading: leadsLoading } = useQuery({ 
    queryKey: ['topLeads', selectedBranchId], 
    queryFn: () => getTopLeads(branchParam) 
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!containerRef.current) return;

    try {
      setIsExporting(true);
      toast.loading("Preparing your analytics export...", { id: "export-analytics-pdf" });

      // Wait a moment for any micro-animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await htmlToImage.toPng(containerRef.current, {
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
        format: [containerRef.current.offsetWidth + 80, containerRef.current.offsetHeight + 80]
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 40, 40, pdfWidth - 80, pdfHeight - 80);
      pdf.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success("Analytics report exported successfully!", { id: "export-analytics-pdf" });
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export analytics report. Please try again.", { id: "export-analytics-pdf" });
    } finally {
      setIsExporting(false);
    }
  };

  const salesData = ensureArray<{ name: string; total: number }>(salesDataRaw).filter(item => item && typeof item === 'object');
  const leadSources = ensureArray<{ source: string; count: number }>(leadSourcesRaw).filter(item => item && typeof item === 'object');
  const topLeads = ensureArray<{ name: string; value: number }>(topLeadsRaw).filter(item => item && typeof item === 'object');



  const { data: leadsData, isLoading: leadsListLoading } = useQuery({
    queryKey: ['leads', 'analytics-full', selectedBranchId],
    queryFn: () => getLeads({ pageSize: 1000, branchId: branchParam })
  });

  const leads = (leadsData as { leads: Lead[] })?.leads || [];

  // Process Leads vs Conversion (by Source)
  const conversionData = (() => {
    const dataMap: Record<string, { total: number; converted: number }> = {};
    leads.forEach((l: Lead) => {
      const key = l.source || 'Unknown';
      if (!dataMap[key]) dataMap[key] = { total: 0, converted: 0 };
      dataMap[key].total++;
      if (l.status === 'converted') dataMap[key].converted++;
    });
    return Object.entries(dataMap).map(([name, stats]) => ({
      name,
      total: stats.total,
      converted: stats.converted
    }));
  })();

  // Process Pipeline (by Status)
  const pipelineData = (() => {
    const counts: Record<string, number> = {};
    const pipelineOrder = ['new', 'contacted', 'pre_qualified', 'qualified', 'nurturing', 'converted', 'lost'];
    leads.forEach((l: Lead) => {
      const status = l.status || 'new'; // valid status fallback or assert type
      counts[status] = (counts[status] || 0) + 1;
    });
    return pipelineOrder
      .filter(status => counts[status] !== undefined)
      .concat(Object.keys(counts).filter(s => !pipelineOrder.includes(s)))
      .map(status => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: counts[status] || 0
      }));
  })();

  return (
    <div ref={containerRef} className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">Deep dive into your sales and marketing performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && branches && branches.length > 0 && (
            <div className="w-[200px]">
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="bg-background border-border h-10 px-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary/60" />
                    <SelectValue placeholder="All Branches" />
                  </div>
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
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleExportPDF}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>{isExporting ? 'Exporting...' : 'Export PDF'}</span>
          </Button>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>Revenue over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 relative overflow-hidden">
            {salesLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-[350px] w-full" />
              </div>
            ) : (
              <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} debounce={100}>
                <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number | undefined) => [`₹${(value || 0).toLocaleString()}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#818cf8" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lead Sources Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
            <CardDescription>Where your leads are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-w-0 relative overflow-hidden">
              {sourcesLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[300px] w-[300px] rounded-full" />
                </div>
              ) : leadSources.length > 0 ? (
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} debounce={100}>
                  <PieChart>
                    <Pie
                      data={leadSources}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {leadSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Leads Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Leads</CardTitle>
            <CardDescription>Highest value opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-w-0 relative overflow-hidden">
              {leadsLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : topLeads.length > 0 ? (
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} debounce={100}>
                  <BarChart data={topLeads} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number | undefined) => [`₹${(value || 0).toLocaleString()}`, 'Value']}
                    />
                    <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Leads Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leads vs Conversion Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Leads vs Conversion</CardTitle>
            <CardDescription>Conversion performance by source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-w-0 relative overflow-hidden">
              {leadsListLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} debounce={100}>
                  <BarChart data={conversionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="total" name="Total Leads" fill="#2dd4bf" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="converted" name="Converted" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Pipeline Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
            <CardDescription>Leads by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-w-0 relative overflow-hidden">
              {leadsListLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-[300px] w-full" />
                </div>
              ) : (
                <ResponsiveContainer minWidth={1} minHeight={1} width="100%" height={400} debounce={100}>
                  <BarChart data={pipelineData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" name="Leads" fill="#6ee7b7" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
