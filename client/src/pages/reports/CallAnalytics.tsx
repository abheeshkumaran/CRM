import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getUserCallAnalytics } from '@/services/callService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileDown, Info, PhoneCall, ArrowDown } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export default function CallAnalyticsPage() {
  const [period, setPeriod] = useState('today');
  const [direction, setDirection] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const reportRef = useRef<HTMLDivElement>(null);

  const [user] = useState<{ role: string } | null>(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });

  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'super_admin' || (user as any)?.role === 'organisation_admin';

  // Fetch Branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { getBranches } = await import('@/services/settingsService');
      return getBranches();
    },
    enabled: isAdmin
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['userCallAnalytics', period, direction, selectedBranchId],
    queryFn: () => getUserCallAnalytics(period, direction, selectedBranchId === "all" ? undefined : selectedBranchId),
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);

    return parts.join(' ');
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current) return;

    try {
      toast.loading('Preparing PDF...', { id: 'pdf-export' });
      
      const dataUrl = await toPng(reportRef.current, { backgroundColor: '#fff', cacheBust: true });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
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

      pdf.save(`Call_Report_${period}_${direction}.pdf`);
      
      toast.success('PDF downloaded successfully', { id: 'pdf-export' });
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF', { id: 'pdf-export' });
    }
  };

  if (isLoading) return <PageLoader text="Loading analytics..." />;
  if (error) return <div className="p-8 text-center text-destructive">Error loading report data.</div>;

  const reportData = data?.reportData || [];

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Call Report</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Detailed user call performance metrics.</p>
        </div>
        <Button onClick={handleDownloadPDF} variant="outline" className="gap-2">
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <div ref={reportRef} className="bg-background space-y-6">
        <Tabs defaultValue="all" onValueChange={setDirection} className="w-full">
          <TabsList className="grid w-full max-w-[400px] grid-cols-3 h-11 bg-muted/50 p-1">
            <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs sm:text-sm">Overall</TabsTrigger>
            <TabsTrigger value="outbound" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs sm:text-sm">Outbound</TabsTrigger>
            <TabsTrigger value="inbound" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all text-xs sm:text-sm">Inbound</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="bg-muted/30 border border-border/50 rounded-lg p-3 flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground/70 shrink-0" />
          <div>
            <span className="font-medium text-foreground/80">TC</span> - Total Calls | 
            <span className="font-medium text-foreground/80 ml-1">CC</span> - Connected Calls | 
            <span className="font-medium text-foreground/80 ml-1">ATT</span> - Average Talk Time | 
            <span className="font-medium text-foreground/80 ml-1">TT</span> - Total Talk Time
          </div>
        </div>

        <div className="flex justify-end gap-3">
          {isAdmin && branches && branches.length > 0 && (
            <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
              <SelectTrigger className="w-[180px] h-9 text-xs sm:text-sm border-border/50 focus:ring-primary/20">
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] h-9 text-xs sm:text-sm border-border/50 focus:ring-primary/20">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="border-border/40 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground w-[200px]">Agent Name</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Branch</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  <div className="flex items-center justify-center gap-1">
                    TC <ArrowDown className="h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">CC</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">TT</TableHead>
                <TableHead className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">ATT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length > 0 ? (
                reportData.map((row) => (
                  <TableRow key={row.userId} className="hover:bg-muted/20 border-b border-border/40 last:border-0 transition-colors">
                    <TableCell className="font-medium text-xs sm:text-sm py-4">{row.agentName}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm text-foreground/70">
                      <span className="text-[10px] font-bold uppercase tracking-tighter bg-muted/50 px-2 py-0.5 rounded border border-border/50">
                        {row.branch || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs sm:text-sm font-semibold text-foreground/80">{row.totalCalls}</TableCell>
                    <TableCell className="text-center py-4">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs sm:text-sm font-medium">{row.connectedCalls}</span>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {row.totalCalls > 0 ? Math.round((row.connectedCalls / row.totalCalls) * 100) : 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs sm:text-sm text-foreground/70">{formatDuration(row.totalDurationSeconds)}</TableCell>
                    <TableCell className="text-center text-xs sm:text-sm text-foreground/70">
                      {formatDuration(row.connectedCalls > 0 ? row.totalDurationSeconds / row.connectedCalls : 0)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                    No call data found for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
